/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { userToString, isOwner, doNothing } = require("../../util/util");
const { buildCommandsList } = require("../../util/commands/helpToJSON");
const getChangelog = require("../../modules/getChangelog").default;
const ipc = require("../../modules/concurrency/ipc").default;
const LocaleManager = require("./LocaleManager").default;
const AliasCommand = require("../commands/AliasCommand");
const Category = require("../../util/commands/Category").default;

// TODO: use .fetch instead of .get
function cleanContent(str, guild) {
    return str
        .replace(/@(everyone|here)/g, "@\u200b$1")
        .replace(/<@!?[0-9]+>/g, input => {
            const id = input.replace(/<|!|>|@/g, "");

            const member = guild.members.cache.get(id);
            if (member) {
                return `@${member.displayName}`;
            }
            const user = guild.client.users.cache.get(id);
            return user ? `@${user.username}` : input;
        })
        .replace(/<#[0-9]+>/g, input => {
            const channel = guild.client.channels.cache.get(input.replace(/<|#|>/g, ""));
            return channel ? `#${channel.name}` : input;
        })
        .replace(/<@&[0-9]+>/g, input => {
            const role = guild.roles.cache.get(input.replace(/<|@|>|&/g, ""));
            return role ? `@${role.name}` : input;
        });
}

/**
 * @param {Date} ts
 * @returns {string}
 */
function ts(ts) {
    return ts.toISOString();
}

class WebsiteManager {
    constructor(REGISTRY, client, config, locale, guild_stats, database) {
        this.REGISTRY = REGISTRY;
        this.client = client;
        this.config = config;
        this.locale = locale;
        this.guild_stats = guild_stats;
        this.db = database;

        this.initializeIPC();
    }

    initializeIPC() {
        ipc.answer("checkGuilds", guildIds => guildIds.filter(guildId => this.client.guilds.cache.has(guildId)));

        ipc.answer("overview", async guildId => {
            const month = new Date();
            month.setMonth(month.getMonth() - 1);

            const now = new Date();

            const results = await Promise.all([
                this.guild_stats.get("commands").getRange(month, now, guildId),
                this.guild_stats.get("messages").getRange(month, now, guildId),
                this.guild_stats.get("users").getRange(month, now, guildId),

                this.guild_stats.get("users").getLastItemBefore(month, guildId),
            ]);

            return {
                success: true,
                commands: {
                    type: this.guild_stats.get("commands").type,
                    data: results[0].map(a => {
                        a.ts = ts(a.ts);
                        return a;
                    }),
                },
                messages: {
                    type: this.guild_stats.get("messages").type,
                    data: results[1].map(a => {
                        a.ts = ts(a.ts);
                        return a;
                    }),
                },
                users: {
                    type: this.guild_stats.get("users").type,
                    data: results[2].map(a => {
                        a.ts = ts(a.ts);
                        return a;
                    }),
                    before: results[3]
                        ? {
                            ...results[3],
                            ts: ts(results[3].ts),
                        }
                        : undefined,
                },
            };
        });

        const getChannels = guildId => {
            const guild = this.client.guilds.cache.get(guildId);
            return guild.channels.cache
                .array()
                .filter(c => c.type === "text")
                .sort((a, b) => a.rawPosition - b.rawPosition)
                .map(c => ({
                    id: c.id,
                    name: c.name,
                }));
        };

        const getRoles = guildId => {
            const guild = this.client.guilds.cache.get(guildId);
            return guild.roles.cache
                .array()
                .filter(r => r.name !== "@everyone")
                .sort((a, b) => b.rawPosition - a.rawPosition)
                .map(c => ({
                    id: c.id,
                    color: c.color === 0 ? null : c.hexColor,
                    name: c.name,
                }));
        };

        ipc.answer("commands", async guildId => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            const disabledCommands = await this.db.collection("disabled_commands").findOne({
                guildId,
            });

            const disabledChannels = await this.db
                .collection("disabled_commands_channels")
                .find({
                    guildId,
                })
                .toArray();

            const commands = [];
            const config = await this.config.get(guildId);
            for (const [name, command] of this.REGISTRY.commands) {
                if (command instanceof AliasCommand) continue;
                if (command.category === Category.OWNER) continue;
                if (!command.help) continue;

                const enabled = !(disabledCommands && disabledCommands.commands.includes(name));

                const disabled_channels = disabledChannels.find(c => c.command === name);

                commands.push({
                    name,
                    enabled,
                    disabled_channels: disabled_channels ? disabled_channels.channels : [],
                });
            }

            return {
                prefix: config.prefix,
                commands,
                channels: getChannels(guildId),
                success: true,
            };
        });

        ipc.answer("commandUpdate", async ({ guildId, commandName, enabled, disabled_channels }) => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            if (!this.REGISTRY.commands.has(commandName)) return { success: false };

            if (!disabled_channels) {
                return { success: false };
            }

            await this.db.collection("disabled_commands_channels").updateOne(
                {
                    guildId,
                    command: commandName,
                },
                { $set: { channels: disabled_channels } },
                { upsert: true }
            );

            if (enabled == undefined) {
                return { success: false };
            } else if (enabled) {
                await this.db.collection("disabled_commands").updateOne(
                    {
                        guildId,
                    },
                    { $pull: { commands: commandName } }
                );
                return { success: true, enabled: true, disabled_channels };
            }
            await this.db.collection("disabled_commands").updateOne(
                {
                    guildId,
                },
                { $addToSet: { commands: commandName } },
                { upsert: true }
            );
            return { success: true, enabled: false, disabled_channels };
        });

        /*
         * ==== CUSTOM COMMANDS ====
         */

        ipc.answer("cc:get", async guildId => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            const commands = await this.REGISTRY.CC.getCommandsForWeb(guildId);
            const settings = await this.REGISTRY.CC.getSettings(guildId);

            const config = await this.config.get(guildId);

            return {
                prefix: config.prefix,
                commands: commands,
                settings,
                channels: getChannels(guildId),
                roles: getRoles(guildId),
                success: true,
            };
        });

        ipc.answer("cc:updateSettings", async ({ guildId, allowed_roles }) => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            const settings = await this.REGISTRY.CC.updateSettings(guildId, { allowed_roles });

            return {
                success: true,
                settings,
            };
        });

        ipc.answer("cc:new", async ({ guildId, type, trigger, case_sensitive, code, disabled_channels }) => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            try {
                const command = await this.REGISTRY.CC.addCommand(guildId, {
                    type,
                    trigger,
                    case_sensitive,
                    code,
                    disabled_channels,
                });
                return {
                    command,
                    success: true,
                };
            } catch (err) {
                return { success: false };
            }
        });

        ipc.answer("cc:update", async ({ guildId, commandId, type, trigger, case_sensitive, code, disabled_channels }) => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            if (!(await this.REGISTRY.CC.hasCommand(guildId, commandId))) return { success: false };

            try {
                const command = await this.REGISTRY.CC.updateCommand(guildId, commandId, {
                    type,
                    trigger,
                    case_sensitive,
                    code,
                    disabled_channels,
                });
                return {
                    command,
                    success: true,
                };
            } catch (err) {
                return { success: false };
            }
        });

        ipc.answer("cc:enabled", async ({ guildId, commandId, enabled }) => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            if (!(await this.REGISTRY.CC.hasCommand(guildId, commandId))) return { success: false };

            try {
                return {
                    success: true,
                    enabled: await this.REGISTRY.CC.enableCommand(guildId, commandId, enabled),
                };
            } catch (err) {
                return { success: false };
            }
        });

        ipc.answer("cc:delete", async ({ guildId, commandId }) => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            if (!(await this.REGISTRY.CC.hasCommand(guildId, commandId))) return { success: false };

            try {
                await this.REGISTRY.CC.removeCommand(guildId, commandId);
                return {
                    success: true,
                };
            } catch (err) {
                return { success: false };
            }
        });

        ipc.answer("cc:geterrors", async ({ guildId, commandId }) => {
            if (!this.client.guilds.cache.has(guildId)) return { errors: [], success: false };

            if (!(await this.REGISTRY.CC.hasCommand(guildId, commandId))) return { errors: [], success: false };

            try {
                const errors = await this.REGISTRY.CC.getErrors(guildId, commandId);
                return {
                    errors: errors.map(e => {
                        e.ts = ts(e.ts);
                        return e;
                    }),
                    success: true,
                };
            } catch (err) {
                return { errors: [], success: false };
            }
        });

        ipc.answer("cc:lint", async code => {
            const { errors } = await this.REGISTRY.CC.cpc.awaitAnswer("lint", { code });
            return {
                success: true,
                errors,
            };
        });

        ipc.answer("deleted", async guildId => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            const database = this.db.collection("deleted_messages");
            const deleted_raw = await database.find({ guildId }).toArray();

            const guild = this.client.guilds.cache.get(guildId);

            const deleted = [];

            for (const row of deleted_raw.filter(m => "deletedAt" in m)) {
                const channel = guild.channels.cache.get(row.channelId);
                const user = await this.client.users.fetch(row.userId).catch(doNothing);
                deleted.push({
                    user: user ? userToString(user, true) : row.name, // "unknown-user" for backwards compatability support
                    channel: {
                        id: channel ? channel.id : row.channelId,
                        name: channel ? channel.name : "deleted-channel",
                    },
                    edits: row.edits.map(e => ({ content: cleanContent(e.content, guild), editedAt: ts(e.editedAt) })),
                    attachments: row.attachments,
                    deletedAt: ts(row.deletedAt),
                });
            }

            return {
                deleted,
                success: true,
            };
        });

        ipc.answer("deletedClear", async guildId => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            const database = this.db.collection("deleted_messages");
            await database.deleteMany({ guildId });

            return {
                deleted: [],
                success: true,
            };
        });

        ipc.answer("settings", async guildId => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            const config = await this.config.get(guildId);
            const locale = await this.locale.get(guildId);

            const guild = this.client.guilds.cache.get(guildId);

            const channels = [];
            for (const key in locale.channels) {
                if (!guild.channels.cache.has(key)) continue;
                const channel = guild.channels.cache.get(key);
                channels.push({
                    id: channel.id,
                    name: channel.name,
                    position: channel.rawPosition,
                    locale: locale.channels[key],
                });
            }

            const disabled_channels = await this.db.collection("disabled_channels").findOne({
                guildId,
            });

            return {
                success: true,
                settings: config,
                locale: {
                    global: locale.global,
                    channels: channels
                        .sort((a, b) => a.position - b.position)
                        .map(c => ({
                            id: c.id,
                            name: c.name,
                            locale: c.locale,
                        })),
                },
                disabled: disabled_channels ? disabled_channels.channels : [],
                channels: guild.channels.cache
                    .array()
                    .sort((a, b) => a.rawPosition - b.rawPosition)
                    .filter(c => c.type === "text")
                    .map(c => ({
                        id: c.id,
                        name: c.name,
                    })),
                locales: LocaleManager.getLocales(),
            };
        });

        ipc.answer("settingsUpdate", async ({ guildId, settings, locale, disabled }) => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            // Locale
            const locale_json = {};
            locale_json.global = locale.global;
            locale_json.channels = {};

            for (const channel of locale.channels) {
                locale_json.channels[channel.id] = channel.locale;
            }

            await this.locale.set(guildId, locale_json);

            // Config
            await this.config.set(guildId, settings);

            // Disabled
            const disabledTrue = [];
            for (const channelId of disabled) {
                if (this.client.guilds.cache.get(guildId).channels.cache.has(channelId)) {
                    disabledTrue.push(channelId);
                }
            }

            await this.db.collection("disabled_channels").updateOne(
                {
                    guildId,
                },
                { $set: { channels: disabledTrue } },
                { upsert: true }
            );

            // Get values
            settings = await this.config.get(guildId);
            locale = await this.locale.get(guildId);

            const channels = [];
            for (const key in locale.channels) {
                if (!this.client.channels.cache.has(key)) continue;
                const channel = this.client.channels.cache.get(key);
                channels.push({
                    id: channel.id,
                    name: channel.name,
                    position: channel.rawPosition,
                    locale: locale.channels[key],
                });
            }

            return {
                success: true,
                settings,
                locale: {
                    global: locale.global,
                    channels: channels
                        .sort((a, b) => a.position - b.position)
                        .map(c => ({
                            id: c.id,
                            name: c.name,
                            locale: c.locale,
                        })),
                },
                disabled: disabledTrue,
            };
        });

        ipc.answer("settingsReset", async ({ guildId }) => {
            if (!this.client.guilds.cache.has(guildId)) return { success: false };

            await this.config.set(guildId, this.config.default_config);
            await this.locale.delete(guildId);

            await this.db.collection("disabled_channels").deleteOne({
                guildId,
            });

            await this.db.collection("disabled_commands_channels").deleteOne({
                guildId,
            });

            await this.db.collection("disabled_commands").deleteOne({
                guildId,
            });

            const config = await this.config.get(guildId);
            const locale = await this.locale.get(guildId);

            const channels = [];
            for (const key in locale.channels) {
                if (!this.client.channels.cache.has(key)) continue;
                const channel = this.client.channels.cache.get(key);
                channels.push({
                    id: channel.id,
                    name: channel.name,
                    position: channel.rawPosition,
                    locale: locale.channels[key],
                });
            }

            return {
                success: true,
                settings: config,
                locale: {
                    global: locale.global,
                    channels: channels
                        .sort((a, b) => a.position - b.position)
                        .map(c => ({
                            id: c.id,
                            name: c.name,
                            locale: c.locale,
                        })),
                },
                disabled: [],
            };
        });

        // ADMIN

        ipc.answer("admin:isadmin", async userId => {
            const user = await this.client.users.fetch(userId).catch(doNothing);
            if (!user) return false;

            const isAdmin = isOwner(user);
            return isAdmin;
        });

        ipc.answer("admin:fucks", async (req = {}) => {
            let fucks = [];
            if (req.all == true) {
                fucks = await this.db.collection("fuck").find({}).toArray();
            } else {
                fucks = await this.db
                    .collection("fuck")
                    .find({
                        verified: {
                            $not: {
                                $eq: true,
                            },
                        },
                    })
                    .toArray();
            }

            return {
                success: true,
                fucks,
            };
        });

        ipc.answer("admin:verifyFuck", async ({ fuckId, verified }) => {
            await this.db.collection("fuck").updateOne(
                {
                    _id: fuckId,
                },
                { $set: { verified: !!verified } }
            );

            return { success: true };
        });

        ipc.answer("admin:deleteFuck", async _id => {
            await this.db.collection("fuck").deleteOne({
                _id,
            });

            return { success: true };
        });

        ipc.answer("site:commands", () => {
            const c = buildCommandsList(this.config.default_config.prefix, this.REGISTRY.commands);
            return c;
        });

        ipc.answer("site:changelog", async () => {
            const changelog = await getChangelog();
            return { logs: changelog };
        });
    }
}

module.exports = WebsiteManager;
