const ipc = require("../ipc");
const AliasCommand = require("../../class/AliasCommand");
const Category = require("../commands/Category");
const helpToJSON = require("./website/helpToJSON");

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

            const disabledCommands = await this.db.collection("disabled_commands").find({
                guildId
            }).toArray();

            const commands = new Array;
            const config = await this.config.get(guildId);
            for (let [name, command] of this.REGISTRY.commands) {
                if (command instanceof AliasCommand) continue;
                if (command.category === Category.OWNER) continue;
                const help = command.help;
                if (!help) continue;

                const enabled = !disabledCommands.find(row => row.name === name);

                commands.push({
                    name,
                    help: helpToJSON(config, name, command),
                    enabled
                });
            }
            return {
                prefix: config.prefix,
                commands,
                success: true
            };
        });

        ipc.answer("commandUpdate", async ({ guildId, commandName, enabled }) => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            if (!this.REGISTRY.commands.has(commandName))
                return { success: false };

            if (enabled == undefined) {
                return { success: false };
            } else if (enabled) {
                await this.db.collection("disabled_commands").deleteOne({
                    guildId,
                    name: commandName
                });
                return { success: true, enabled: true };
            } else {
                if (!(await this.db.collection("disabled_commands").findOne({
                    guildId,
                    name: commandName
                }))) {
                    await this.db.collection("disabled_commands").insertOne({
                        guildId,
                        name: commandName
                    });
                }
                return { success: true, enabled: false };
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
                    user: user ? user.username : "unknown-user",
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

            return {
                success: true,
                settings: config,
                channels: this.client.guilds.get(guildId).channels.array().sort((a, b) => {
                    return a.position - b.position;
                }).filter(c => c.type === "text").map(c => {
                    return {
                        id: c.id,
                        name: c.name
                    };
                }),
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
                locales: this.client.locale.locales
            };
        });

        ipc.answer("settingsUpdate", async ({ guildId, settings, locale }) => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            const locale_json = {};
            locale_json.global = locale.global;
            locale_json.channels = {};

            for (const channel of locale.channels) {
                locale_json.channels[channel.id] = channel.locale;
            }

            await this.config.set(guildId, settings);
            await this.client.locale.set(guildId, locale_json);

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
                }
            };
        });

        ipc.answer("settingsReset", async ({ guildId }) => {
            if (!this.client.guilds.has(guildId))
                return { success: false };

            await this.config.set(guildId, this.config.default_config);
            await this.client.locale.delete(guildId);

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
                }
            };
        });
    }
}

module.exports = WebsiteManager;