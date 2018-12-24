const log = require("../../modules/log");
const { isOwner } = require("../../modules/utils");
const { splitArgs } = require("../../modules/string_utils");
// eslint-disable-next-line no-unused-vars
const BaseCommand = require("../../class/BaseCommand");
const AliasCommand = require("../../class/AliasCommand");
const TreeCommand = require("../../class/TreeCommand");
const Category = require("../commands/Category");
const CommandPermission = require("../commands/CommandPermission");
const HelpBuilder = require("../commands/HelpBuilder");

class CommandRegistry {
    constructor(client, config, database) {
        this.client = client;
        this.config = config;
        this.database = database;

        /** @type {Map<string, BaseCommand>} */
        this.commands = new Map;
    }

    async process(message, command_name, content, prefix, prefixUsed) {
        // only for now!!!
        if (message.channel.type !== "text") return false;

        let command = this.commands.get(command_name);

        if (command && command instanceof AliasCommand) {
            command_name = command.parentName;
            command = command.command;
        }

        // is the case of cases, Owner should be able to use Owner commands everywhere, regardless of timeouts and other problems
        const isOwnerCommand = command && command.category && command.category === Category.OWNER && isOwner(message.author);

        if (prefixUsed && command && command.ignore && !isOwnerCommand) {
            const blacklistedUsers = await this.database.collection("blacklisted").findOne({ userId: message.author.id });
            if (blacklistedUsers) {
                await message.channel.send("You have been blacklisted from using all of Trixie's functions. " +
                    "If you wish to get more details on why, don't hesitate to join the support server and ask, but be sincere.");
                return false;
            }

            const [disabledCommands, disabledUsers, disabledChannels] = await Promise.all([
                this.database.collection("disabled_commands").findOne({
                    guildId: message.guild.id,
                    commands: {
                        $all: [command_name]
                    }
                }),
                this.database.collection("disabled_users").findOne({
                    guildId: message.guild.id,
                    members: {
                        $all: [message.member.id]
                    }
                }),
                this.database.collection("disabled_channels").findOne({
                    guildId: message.guild.id,
                    channels: {
                        $all: [message.channel.id]
                    }
                })
            ]);

            if (disabledCommands) return false;
            if (disabledUsers) return false;
            const category = command.category;
            if (disabledChannels &&
                category !== Category.MODERATION &&
                category !== Category.OWNER) return false;

            const disabledCommandChannels = await this.database.collection("disabled_commands_channels").findOne({
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
            const timeouted = await this.database.collection("timeout").findOne({ guildId: message.guild.id, memberId: message.member.id });
            if (timeouted) return false;
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
            await command.run(message, command_name, content, pass_through);

            await Promise.all(promises.values());

            return true;
        }
    }

    register(id, command) {
        if (this.commands.has(id)) throw new Error("Command name already exists");

        command.name = id;
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

    addSubCommandTo(command, name, subCommand) {
        if (!(command instanceof TreeCommand)) throw new Error("Can only add SubCommand to a TreeCommand instance");

        command.addSubCommand(name, subCommand);
    }

    get(id) {
        return this.commands.get(id);
    }
}

// CommandRegistry.GUILD_ONLY = 0;
// CommandRegistry.GUILD_AND_GROUP = 1;
// CommandRegistry.ALL = 2;

module.exports = CommandRegistry;