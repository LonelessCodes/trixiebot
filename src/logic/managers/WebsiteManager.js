const { userToString } = require("../../modules/utils");
const ipc = require("../ipc");
const AliasCommand = require("../../class/AliasCommand");
const Category = require("../commands/Category");

class WebsiteManager {
    constructor(REGISTRY, client, config, database) {
        this.REGISTRY = REGISTRY;
        this.client = client;
        this.config = config;
        this.db = database;

        this.initializeIPC();
    }

    async initializeIPC() {
        await ipc.promiseStart;

        ipc.answer("checkGuilds", async guildIds => {
            return guildIds.filter(guildId => this.client.guilds.has(guildId));
        });

        ipc.answer("commands", async guildId => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            const disabledCommands = await this.db.collection("disabled_commands").findOne({
                guildId
            });

            const disabledChannels = await this.db.collection("disabled_commands_channels").find({
                guildId
            }).toArray();

            const commands = new Array;
            const config = await this.config.get(guildId);
            for (let [name, command] of this.REGISTRY.commands) {
                if (command instanceof AliasCommand) continue;
                if (command.category === Category.OWNER) continue;
                const help = command.help;
                if (!help) continue;

                const enabled = !(disabledCommands && disabledCommands.commands.includes(name));

                const disabled_channels = disabledChannels.find(c => c.command === name);

                commands.push({
                    name,
                    enabled,
                    disabled_channels: disabled_channels ? disabled_channels.channels : []
                });
            }

            return {
                prefix: config.prefix,
                commands,
                channels: this.client.guilds.get(guildId).channels.array().sort((a, b) => {
                    return a.position - b.position;
                }).filter(c => c.type === "text").map(c => {
                    return {
                        id: c.id,
                        name: c.name
                    };
                }),
                success: true
            };
        });

        ipc.answer("commandUpdate", async ({ guildId, commandName, enabled, disabled_channels }) => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            if (!this.REGISTRY.commands.has(commandName))
                return { success: false };

            if (!disabled_channels) {
                return { success: false };
            }

            await this.db.collection("disabled_commands_channels").updateOne({
                guildId,
                command: commandName
            }, { $set: { channels: disabled_channels } }, { upsert: true });

            if (enabled == undefined) {
                return { success: false };
            } else if (enabled) {
                await this.db.collection("disabled_commands").updateOne({
                    guildId
                }, { $pull: { commands: commandName } });
                return { success: true, enabled: true, disabled_channels };
            } else {
                await this.db.collection("disabled_commands").updateOne({
                    guildId
                }, { $addToSet: { commands: commandName } }, { upsert: true });
                return { success: true, enabled: false, disabled_channels };
            }
        });

        function cleanContent(str, guild) {
            return str
                .replace(/@(everyone|here)/g, "@\u200b$1")
                .replace(/<@!?[0-9]+>/g, input => {
                    const id = input.replace(/<|!|>|@/g, "");

                    const member = guild.members.get(id);
                    if (member) {
                        return `@${member.displayName}`;
                    } else {
                        const user = this.client.users.get(id);
                        return user ? `@${user.username}` : input;
                    }
                })
                .replace(/<#[0-9]+>/g, input => {
                    const channel = this.client.channels.get(input.replace(/<|#|>/g, ""));
                    return channel ? `#${channel.name}` : input;
                })
                .replace(/<@&[0-9]+>/g, input => {
                    const role = guild.roles.get(input.replace(/<|@|>|&/g, ""));
                    return role ? `@${role.name}` : input;
                });
        }

        ipc.answer("deleted", async guildId => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            const database = this.db.collection("deleted_messages");
            const deleted_raw = await database.find({ guildId }).toArray();

            const guild = this.client.guilds.get(guildId);

            const deleted = [];

            for (const row of deleted_raw) {
                const channel = this.client.channels.get(row.channelId);
                const user = this.client.users.get(row.memberId);
                deleted.push({
                    user: user ? userToString(user, true) : "unknown-user",
                    channel: {
                        id: channel ? channel.id : row.channelId,
                        name: channel ? channel.name : "deleted-channel"
                    },
                    content: cleanContent(row.message, guild),
                    timestamp: row.timestamp.getTime()
                });
            }

            return {
                deleted,
                success: true
            };
        });

        ipc.answer("deletedClear", async guildId => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            const database = this.db.collection("deleted_messages");
            await database.deleteMany({ guildId });

            return {
                deleted: [],
                success: true
            };
        });

        ipc.answer("settings", async guildId => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            const config = await this.config.get(guildId);
            const locale = await this.client.locale.get(guildId);

            const channels = [];
            for (const key in locale.channels) {
                if (!this.client.channels.has(key)) continue;
                const channel = this.client.channels.get(key);
                channels.push({
                    id: channel.id,
                    name: channel.name,
                    position: channel.position,
                    locale: locale.channels[key]
                });
            }

            const disabled_channels = await this.db.collection("disabled_channels").findOne({
                guildId
            });

            return {
                success: true,
                settings: config,
                locale: {
                    global: locale.global,
                    channels: channels.sort((a, b) => {
                        return a.position - b.position;
                    }).map(c => {
                        return {
                            id: c.id,
                            name: c.name,
                            locale: c.locale
                        };
                    })
                },
                disabled: disabled_channels ? disabled_channels.channels : [],
                channels: this.client.guilds.get(guildId).channels.array().sort((a, b) => {
                    return a.position - b.position;
                }).filter(c => c.type === "text").map(c => {
                    return {
                        id: c.id,
                        name: c.name
                    };
                }),
                locales: this.client.locale.locales
            };
        });

        ipc.answer("settingsUpdate", async ({ guildId, settings, locale, disabled }) => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            // locale
            const locale_json = {};
            locale_json.global = locale.global;
            locale_json.channels = {};

            for (const channel of locale.channels) {
                locale_json.channels[channel.id] = channel.locale;
            }

            await this.client.locale.set(guildId, locale_json);

            // config
            await this.config.set(guildId, settings);

            // disabled
            const disabledTrue = [];
            for (const channelId of disabled) {
                if (this.client.guilds.get(guildId).channels.has(channelId)) {
                    disabledTrue.push(channelId);
                }
            }

            await this.db.collection("disabled_channels").updateOne({
                guildId
            }, { $set: { channels: disabledTrue } }, { upsert: true });

            // get values
            const config = await this.config.get(guildId);
            locale = await this.client.locale.get(guildId);

            const channels = [];
            for (const key in locale.channels) {
                if (!this.client.channels.has(key)) continue;
                const channel = this.client.channels.get(key);
                channels.push({
                    id: channel.id,
                    name: channel.name,
                    position: channel.position,
                    locale: locale.channels[key]
                });
            }

            return {
                success: true,
                settings: config,
                locale: {
                    global: locale.global,
                    channels: channels.sort((a, b) => {
                        return a.position - b.position;
                    }).map(c => {
                        return {
                            id: c.id,
                            name: c.name,
                            locale: c.locale
                        };
                    })
                },
                disabled: disabledTrue
            };
        });

        ipc.answer("settingsReset", async ({ guildId }) => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            await this.config.set(guildId, this.config.default_config);
            await this.client.locale.delete(guildId);

            await this.db.collection("disabled_channels").deleteOne({
                guildId
            });

            await this.db.collection("disabled_commands_channels").deleteOne({
                guildId
            });

            await this.db.collection("disabled_commands").deleteOne({
                guildId
            });

            const config = await this.config.get(guildId);
            const locale = await this.client.locale.get(guildId);

            const channels = [];
            for (const key in locale.channels) {
                if (!this.client.channels.has(key)) continue;
                const channel = this.client.channels.get(key);
                channels.push({
                    id: channel.id,
                    name: channel.name,
                    position: channel.position,
                    locale: locale.channels[key]
                });
            }

            return {
                success: true,
                settings: config,
                locale: {
                    global: locale.global,
                    channels: channels.sort((a, b) => {
                        return a.position - b.position;
                    }).map(c => {
                        return {
                            id: c.id,
                            name: c.name,
                            locale: c.locale
                        };
                    })
                },
                disabled: []
            };
        });
    }
}

module.exports = WebsiteManager;