const log = require("../log").namespace("registry");
const { isOwner } = require("../util/util");
const { splitArgs } = require("../util/string");
const { toHumanTime } = require("../util/time");
// eslint-disable-next-line no-unused-vars
const { Message } = require("discord.js");
// eslint-disable-next-line no-unused-vars
const BaseCommand = require("./commands/BaseCommand");
const AliasCommand = require("./commands/AliasCommand");
// eslint-disable-next-line no-unused-vars
const CustomCommand = require("./commands/CustomCommand");
const Category = require("../util/commands/Category");
const CommandPermission = require("../util/commands/CommandPermission");
const HelpBuilder = require("../util/commands/HelpBuilder");
const RateLimiter = require("../util/commands/RateLimiter");
const TimeUnit = require("../modules/TimeUnit");
const DocumentMapCache = require("../modules/db/DocumentMapCache");

function debugString(command_name, message) {
    switch (message.channel.type) {
        case "text": return `command:${command_name}, user:${message.author.username}#${message.author.discriminator}, userid:${message.author.id}, guild:${message.guild.id}, channel:${message.channel.id}`;
        default: return `command:${command_name}, user:${message.author.username}#${message.author.discriminator}, userid:${message.author.id}, c_type:${message.channel.type}, channel:${message.channel.id}`;
    }
}

class CommandDispatcher {
    constructor(client, database, registry) {
        this.client = client;
        this.database = database;
        this.REGISTRY = registry;

        this.global_ratelimit = new RateLimiter(TimeUnit.MINUTE, 15, 40);
        this.global_ratelimit_message = new RateLimiter(TimeUnit.MINUTE, 5);

        // caches
        this.blacklisted_users = new DocumentMapCache(
            this.database.collection("blacklisted"),
            "userId",
            { maxSize: 0, ttl: 3600 }
        );

        this.disabled_commands = this.database.collection("disabled_commands");
        this.disabled_commands.createIndex({ guildId: 1 }, { unique: true });
        this.disabled_channels = this.database.collection("disabled_channels");
        this.disabled_channels.createIndex({ guildId: 1 }, { unique: true });
        this.disabled_commands_channels = this.database.collection("disabled_commands_channels");
        this.disabled_commands_channels.createIndex({ guildId: 1, command: 1 }, { unique: true });
        this.timeout = this.database.collection("timeout");
        this.timeout.createIndex({ guildId: 1, memberId: 1 }, { unique: true });
    }

    async rateLimit(message, command_name) {
        if (!this.global_ratelimit || (this.global_ratelimit_message && !this.global_ratelimit_message.testAndAdd(`${command_name}:${message.guild.id}:${message.channel.id}`))) return;
        await message.channel.sendTranslated(`Whoa whoa not so fast! You may only do this ${this.global_ratelimit.max} ${this.global_ratelimit.max === 1 ? "time" : "times"} every ${this.global_ratelimit.toString()}. There is still ${toHumanTime(this.global_ratelimit.tryAgainIn(message.author.id))} left to wait.`);
    }

    async process(message, command_name, content, prefix, prefix_used, timer) {
        if (message.channel.type === "text") {
            /** @type {CustomCommand} */
            const cc = await this.REGISTRY.CC.get(message.guild, { command_name, prefix_used, raw_content: message.content });
            if (cc && cc.enabled) return await this.processCC(message, command_name, content, cc);
        }

        /** @type {BaseCommand} */
        const command = this.REGISTRY.getCommand(command_name);
        if (command) return await this.processCommand(message, command_name, content, prefix_used, command, timer, null);

        /** @type {[RegExp|string, BaseCommand]} */
        const keyword = this.REGISTRY.getKeyword(message.content);
        if (keyword) return await this.processCommand(message, command_name, content, prefix_used, keyword[1], timer, keyword[0]);
    }

    /**
     * @param {Message} message 
     * @param {string} command_name 
     * @param {string} content 
     * @param {CustomCommand} command 
     */
    async processCC(message, command_name, content, command) {
        if (message.guild && !message.member) message.member = message.guild.member(message.author) || null;
        if (!message.member) return false;

        if (await this.blacklisted_users.has(message.author.id)) {
            await message.channel.send("You have been blacklisted from using all of Trixie's functions. " +
                "If you wish to get more details on why, don't hesitate to join the support server and ask, but be sincere.");
            return false;
        }

        const disabledChannels = await this.disabled_channels.findOne({
            guildId: message.guild.id,
            channels: {
                $all: [message.channel.id]
            }
        });
        if (disabledChannels) return false;

        if (command.disabled_channels.includes(message.channel.id)) return false;

        if (!message.channel.nsfw && command.explicit && !message.guild.config.explicit) return false;

        if (!command.permissions.test(message.member)) {
            await command.noPermission(message);
            return false;
        }

        if (!CommandPermission.ADMIN.test(message.member)) {
            const timeouted = await this.timeout.findOne({ guildId: message.guild.id, memberId: message.author.id });
            if (timeouted) return false;
        }

        if (this.global_ratelimit && !this.global_ratelimit.testAndAdd(message.author.id)) {
            await this.rateLimit(message, command.id);
            return false;
        }

        log.debug("CustomC", `command:${command.id}, user:${message.author.username}#${message.author.discriminator}, userid:${message.author.id}, guild:${message.guild.id}, channel:${message.channel.id}`);

        await command.run(message, command_name, content);

        return true;
    }

    /**
     * @param {Message} message
     * @param {string} command_name
     * @param {string} content
     * @param {boolean} prefix_used
     * @param {BaseCommand} command
     * @param {NanoTimer} timer
     */
    async processCommand(message, command_name, content, prefix_used, command, timer, keyword) {
        const c_type = message.channel.type;
        const is_guild = c_type === "text";

        if (command && command instanceof AliasCommand) {
            command_name = command.parentName;
            command = command.command;
        }

        if (!command.hasScope(message.channel)) return;

        // is the case of cases, Owner should be able to use Owner commands everywhere, regardless of timeouts and other problems
        const isOwnerCommand = command && command.category && command.category === Category.OWNER && isOwner(message.author);

        if (command && command.ignore && !isOwnerCommand) {
            if (!keyword && await this.blacklisted_users.has(message.author.id)) {
                await message.channel.send("You have been blacklisted from using all of Trixie's functions. " +
                    "If you wish to get more details on why, don't hesitate to join the support server and ask, but be sincere.");
                return false;
            }

            if (is_guild) {
                if (!keyword) {
                    const [disabledCommands, disabledChannels, disabledCommandChannels] = await Promise.all([
                        this.disabled_commands.findOne({
                            guildId: message.guild.id,
                            commands: {
                                $all: [command_name]
                            }
                        }),
                        this.disabled_channels.findOne({
                            guildId: message.guild.id,
                            channels: {
                                $all: [message.channel.id]
                            }
                        }),
                        this.disabled_commands_channels.findOne({
                            guildId: message.guild.id,
                            command: command_name,
                            channels: {
                                $all: [message.channel.id]
                            }
                        })
                    ]);

                    if (disabledCommands) return false;

                    const category = command.category;
                    if (disabledChannels &&
                        category !== Category.MODERATION &&
                        category !== Category.OWNER) return false;

                    if (disabledCommandChannels &&
                        category !== Category.MODERATION &&
                        category !== Category.OWNER) return false;
                } else {
                    const disabledChannels = await this.disabled_channels.findOne({
                        guildId: message.guild.id,
                        channels: {
                            $all: [message.channel.id]
                        }
                    });

                    const category = command.category;
                    if (disabledChannels &&
                        category !== Category.MODERATION &&
                        category !== Category.OWNER) return false;
                }
            }
        }

        const promises = new Map;

        for (const [, cmd] of this.REGISTRY) {
            if (cmd instanceof AliasCommand) continue;
            if (!cmd.hasScope(message.channel)) continue;
            promises.set(cmd.id, cmd.beforeProcessCall(message, content));
        }

        if (!command) return;
        if (!prefix_used && !keyword) return;

        if (is_guild) {
            // eslint-disable-next-line require-atomic-updates
            if (!message.member) message.member = message.guild.member(message.author) || null;

            if (!message.member) return false;

            if (!message.channel.nsfw && command.explicit) return false;

            if (!isOwnerCommand && !CommandPermission.ADMIN.test(message.member) && command.ignore) {
                const timeouted = await this.timeout.findOne({ guildId: message.guild.id, memberId: message.author.id });
                if (timeouted) return false;
            }
        }

        if (!command.permissions.test(message.member || message.author)) {
            await command.noPermission(message);
            return;
        }

        if (this.global_ratelimit && !this.global_ratelimit.testAndAdd(message.author.id)) {
            await this.rateLimit(message, command_name);
            return;
        }

        if (command.rateLimiter && !command.rateLimiter.testAndAdd(message.author.id)) {
            await command.rateLimit(message);
            return;
        }

        // good to send help when using `command help` and `help command`
        if (/^(help|usage)$/i.test(splitArgs(content, 2)[0]) && !keyword) {
            log.debug("Command", debugString("help", message));

            await HelpBuilder.sendHelp(message, command_name, command);

            await Promise.all(promises.values());

            return true;
        } else {
            if (!keyword) log.debug("Command", debugString(command_name, message));
            else          log.debug("Keyword", debugString(keyword,      message));

            const pass_through = await promises.get(command.id);
            // const command_result = await command.run(message, command_name, content, pass_through);
            await command.run(message, command_name, content, pass_through, timer);

            await Promise.all(promises.values());

            return true;
        }
    }
}

module.exports = CommandDispatcher;
