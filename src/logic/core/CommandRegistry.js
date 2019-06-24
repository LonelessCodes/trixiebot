const log = require("../../modules/log");
const { isOwner } = require("../../modules/util");
const { splitArgs } = require("../../modules/util/string");
const { toHumanTime } = require("../../modules/util/time");
// eslint-disable-next-line no-unused-vars
const { Message } = require("discord.js");
// eslint-disable-next-line no-unused-vars
const BaseCommand = require("../../class/BaseCommand");
const AliasCommand = require("../../class/AliasCommand");
// eslint-disable-next-line no-unused-vars
const CustomCommand = require("../../class/CustomCommand");
const Category = require("../commands/Category");
const CommandPermission = require("../commands/CommandPermission");
const HelpBuilder = require("../commands/HelpBuilder");
const RateLimiter = require("../RateLimiter");
const TimeUnit = require("../../modules/TimeUnit");
const CCManager = require("../managers/CCManager");
const DocumentMapCache = require("../../logic/DocumentMapCache");

class CommandRegistry {
    constructor(client, config, database) {
        this.client = client;
        this.config = config;
        this.database = database;
        this.cc = new CCManager(client, database);

        /** @type {Map<string, BaseCommand>} */
        this.commands = new Map;

        this.global_ratelimit = new RateLimiter(TimeUnit.MINUTE, 15, 20);
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
        // only for now!!!
        if (message.channel.type !== "text") return false;

        /** @type {BaseCommand} */
        let command = await this.cc.get(message.guild, { command_name, prefix_used, raw_content: message.content });
        if (command) return await this.processCC(message, command_name, content, command);

        command = this.commands.get(command_name);
        if (command) return await this.processCommand(message, command_name, content, prefix_used, command, timer);
    }

    /**
     * @param {Message} message 
     * @param {string} command_name 
     * @param {string} content 
     * @param {CustomCommand} command 
     */
    async processCC(message, command_name, content, command) {
        if (!command.enabled) return false;

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

        log.debug("CustomC Registry", `command:${command.id}, user:${message.author.username}#${message.author.discriminator}, userid:${message.author.id}, guild:${message.guild.id}, channel:${message.channel.id}`);

        await command.run(message, command_name, content);

        return true;
    }

    /**
     * @param {Message} message
     * @param {string} command_name
     * @param {string} content
     * @param {boolean} prefixUsed
     * @param {BaseCommand} command
     * @param {NanoTimer} timer
     */
    async processCommand(message, command_name, content, prefixUsed, command, timer) {
        if (command && command instanceof AliasCommand) {
            command_name = command.parentName;
            command = command.command;
        }

        // is the case of cases, Owner should be able to use Owner commands everywhere, regardless of timeouts and other problems
        const isOwnerCommand = command && command.category && command.category === Category.OWNER && isOwner(message.author);

        if (prefixUsed && command && command.ignore && !isOwnerCommand) {
            if (await this.blacklisted_users.has(message.author.id)) {
                await message.channel.send("You have been blacklisted from using all of Trixie's functions. " +
                    "If you wish to get more details on why, don't hesitate to join the support server and ask, but be sincere.");
                return false;
            }

            const [disabledCommands, disabledChannels] = await Promise.all([
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
                })
            ]);

            if (disabledCommands) return false;
            const category = command.category;
            if (disabledChannels &&
                category !== Category.MODERATION &&
                category !== Category.OWNER) return false;

            const disabledCommandChannels = await this.disabled_commands_channels.findOne({
                guildId: message.guild.id,
                command: command_name,
                channels: {
                    $all: [message.channel.id]
                }
            });
            if (disabledCommandChannels &&
                category !== Category.MODERATION &&
                category !== Category.OWNER) return false;
        }

        const promises = new Map;

        for (const [key, cmd] of this.commands) {
            if (cmd instanceof AliasCommand) continue;
            promises.set(key, cmd.beforeProcessCall(message, content));
        }

        if (!prefixUsed || !command) return false;

        if (!message.channel.nsfw && command.explicit && !message.guild.config.explicit) return false;

        if (!command.permissions.test(message.member)) {
            await command.noPermission(message);
            return;
        }

        if (!isOwnerCommand && !CommandPermission.ADMIN.test(message.member) && command.ignore) {
            const timeouted = await this.timeout.findOne({ guildId: message.guild.id, memberId: message.author.id });
            if (timeouted) return false;
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
        if (/^(help|usage)$/i.test(splitArgs(content, 2)[0])) {
            log.debug("Command Registry", `command:help, user:${message.author.username}#${message.author.discriminator}, userid:${message.author.id}, guild:${message.guild.id}, channel:${message.channel.id}`);

            await HelpBuilder.sendHelp(message, command_name, command);

            await Promise.all(promises.values());

            return true;
        } else {
            log.debug("Command Registry", `command:${command_name}, user:${message.author.username}#${message.author.discriminator}, userid:${message.author.id}, guild:${message.guild.id}, channel:${message.channel.id}`);

            const pass_through = await promises.get(command_name);
            // const command_result = await command.run(message, command_name, content, pass_through);
            await command.run(message, command_name, content, pass_through, timer);

            await Promise.all(promises.values());

            return true;
        }
    }

    register(id, command) {
        if (this.commands.has(id)) throw new Error("Command name already exists");

        this.commands.set(id, command);
        return command;
    }

    registerAlias(command, alias) {
        if (!this.commands.has(command)) throw new Error(command + " isn't in the command map...");
        if (this.commands.has(alias)) throw new Error("Alias '" + alias + "' is already registered in the command map...");

        const cmd = this.commands.get(command);
        cmd.aliases.push(alias);
        this.register(alias, new AliasCommand(command, cmd));
    }

    get(id) {
        return this.commands.get(id);
    }
}

module.exports = CommandRegistry;