/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
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

const log = require("../log").default.namespace("registry");
const { splitArgs } = require("../util/string");
// eslint-disable-next-line no-unused-vars
const BaseCommand = require("./commands/BaseCommand");
// eslint-disable-next-line no-unused-vars
const CustomCommand = require("./commands/CustomCommand");
const Category = require("../util/commands/Category").default;
const CommandPermission = require("../util/commands/CommandPermission").default;
const CommandScope = require("../util/commands/CommandScope").default;
const HelpBuilder = require("../util/commands/HelpBuilder").default;
const RateLimiter = require("../util/commands/RateLimiter").default;
const TimeUnit = require("../modules/TimeUnit").default;
const DocumentMapCache = require("../modules/db/DocumentMapCache").default;
// eslint-disable-next-line no-unused-vars
const MessageContext = require("../util/commands/MessageContext").default;
// eslint-disable-next-line no-unused-vars
const Discord = require("discord.js");
// eslint-disable-next-line no-unused-vars
const Mongo = require("mongodb");
const CommandRegistry = require("./CommandRegistry");

const Translation = require("../modules/i18n/Translation").default;
const TranslationPlural = require("../modules/i18n/TranslationPlural").default;
const DurationFormat = require("../modules/i18n/DurationFormat").default;

/**
 * @param {string} command_name
 * @param {MessageContext} context
 * @returns {string}
 */
function debugString(command_name, context) {
    switch (context.channel.type) {
        case "text":
            return `command:${command_name}, user:${context.author.username}#${context.author.discriminator}, userid:${context.author.id}, channel:${context.channel.id}, guild:${context.guild.id}`;
        default:
            return `command:${command_name}, user:${context.author.username}#${context.author.discriminator}, userid:${context.author.id}, channel:${context.channel.id}, c_type:${context.channel.type}`;
    }
}

class CommandDispatcher {
    /**
     * @param {Discord.Client} client
     * @param {Mongo.Db} database
     * @param {CommandRegistry} registry
     */
    constructor(client, database, registry) {
        this.client = client;
        this.REGISTRY = registry;

        this.global_ratelimit = new RateLimiter(TimeUnit.MINUTE, 15, 40);
        this.global_ratelimit_message = new RateLimiter(TimeUnit.MINUTE, 5);

        // caches
        this.blacklisted_users = new DocumentMapCache(database.collection("blacklisted"), "userId", { maxSize: 0, ttl: 3600 });

        this.timeout = database.collection("timeout");
        this.timeout.createIndex({ guildId: 1, memberId: 1 }, { unique: true });
        this.disabled_commands = database.collection("disabled_commands");
        this.disabled_commands.createIndex({ guildId: 1 }, { unique: true });
        this.disabled_channels = database.collection("disabled_channels");
        this.disabled_channels.createIndex({ guildId: 1 }, { unique: true });
        this.disabled_categories = database.collection("disabled_categories");
        this.disabled_categories.createIndex({ guildId: 1 }, { unique: true });
        this.disabled_commands_channels = database.collection("disabled_commands_channels");
        this.disabled_commands_channels.createIndex({ guildId: 1, command: 1 }, { unique: true });
    }

    async rateLimit(context) {
        if (!this.global_ratelimit_message.testAndAdd(`${context.guild.id}:${context.channel.id}`)) return;

        await context.send(new TranslationPlural("command.ratelimit", [
            "Whoa whoa not so fast! You may only do this {{count}} time every {{time_frame}}. " +
            "There is still {{time_left}} left to wait.",
            "Whoa whoa not so fast! You may only do this {{count}} times every {{time_frame}}. " +
            "There is still {{time_left}} left to wait.",
        ], {
            count: this.global_ratelimit.max,
            time_frame: this.global_ratelimit.timeUnit.toTranslation(this.global_ratelimit.timeNum),
            time_left: new DurationFormat(this.global_ratelimit.tryAgainIn(context.author.id)),
        }));
    }

    /**
     * @param {MessageContext} ctx
     * @param {string} command_name
     */
    async process({ message, channel, guild, prefix_used, ctx }, command_name) {
        if (channel.type === "text") {
            /** @type {CustomCommand} */
            const cc = await this.REGISTRY.CC.get(guild, { command_name, prefix_used, raw_content: message.content });
            if (cc && cc.enabled) return await this.processCC(ctx, command_name, cc);
        }

        const command = this.REGISTRY.getCommand(message, prefix_used, command_name);
        if (command) return await this.processCommand(ctx, command.type, command.trigger, command.command);

        await this.processCommand(ctx, -1, command_name, null);
    }

    /**
     * @param {MessageContext} context
     * @param {string} command_name
     * @param {CustomCommand} command
     */
    async processCC(context, command_name, command) {
        if (!context.member) return false;

        if (await this.blacklisted_users.has(context.author.id)) {
            await context.send(new Translation(
                "general.blacklisted",
                "You have been blacklisted from using all of Trixie's functions. " +
                "If you wish to get more details on why, don't hesitate to join the support server and ask, but be sincere."
            ));
            return false;
        }

        const disabledChannels = await this.disabled_channels.findOne({
            guildId: context.guild.id,
            channels: {
                $all: [context.channel.id],
            },
        });
        if (disabledChannels) return false;

        if (command.disabled_channels.includes(context.channel.id)) return false;

        if (!context.channel.nsfw && command.explicit && !context.config.explicit) return false;

        if (!command.permissions.test(context.member)) {
            await command.noPermission(context);
            return false;
        }

        if (!CommandPermission.ADMIN.test(context.member)) {
            const timeouted = await this.timeout.findOne({ guildId: context.guild.id, memberId: context.author.id });
            if (timeouted) return false;
        }

        if (!this.global_ratelimit.testAndAdd(context.author.id)) {
            await this.rateLimit(context);
            return false;
        }

        log.debug("CustomC", `command:${command.id}, user:${context.author.username}#${context.author.discriminator}, userid:${context.author.id}, guild:${context.guild.id}, channel:${context.channel.id}`);

        await command.run(context, command_name);

        return true;
    }

    /**
     * @param {MessageContext} context
     * @param {number} type
     * @param {string|RegExp} cmd_name
     * @param {BaseCommand} command
     * @returns {Promise<boolean>}
     */
    async processCommand(context, type, cmd_name, command) {
        const processed_handlers = this.REGISTRY.processed_handlers.filter(h => CommandScope.hasScope(h.scope, context.channel));

        for (let { handler } of processed_handlers.filter(h => h.priority)) handler(context);

        const is_command = type === CommandRegistry.TYPE.COMMAND;
        const is_guild = context.channel.type === "text";

        // is the case of cases, Owner should be able to use Owner commands everywhere, regardless of timeouts and other problems
        const is_owner = Category.OWNER.permissions.test(context.author);
        const is_owner_cmd = command && command.category === Category.OWNER && is_owner;

        // user is a mod
        const is_mod = is_guild && Category.MODERATION.permissions.test(context.member);
        // command is moderation and user got perms for it
        // we check for the perms of the category, because there are now two moderator categories: Config and Moderation
        // that use CommandPermissions.ADMIN
        const is_mod_cmd =
            command &&
            is_guild &&
            command.category.permissions === Category.MODERATION.permissions &&
            command.permissions.test(context.member);

        if (!is_owner_cmd) {
            if (await this.blacklisted_users.has(context.author.id)) {
                if (command && is_command) await context.send(new Translation(
                    "general.blacklisted",
                    "You have been blacklisted from using all of Trixie's functions. " +
                    "If you wish to get more details on why, don't hesitate to join the support server and ask, but be sincere."
                ));
                return false;
            }

            if (is_guild) {
                if (!is_mod_cmd) {
                    const disabled_chs = await this.disabled_channels.findOne({
                        guildId: context.guild.id,
                        channels: {
                            $all: [context.channel.id],
                        },
                    });
                    if (disabled_chs) return false;
                }

                if (!is_owner && !is_mod) {
                    const timeouted = await this.timeout.findOne({ guildId: context.guild.id, memberId: context.author.id });
                    if (timeouted) return false;
                }
            }
        }

        for (let { handler } of processed_handlers.filter(h => !h.priority)) handler(context);

        if (!command) return false;

        if (!command.hasScope(context.channel)) return false;
        if (!command.isInSeason()) return false;

        if (is_guild) {
            if (is_command && !is_owner_cmd && !is_mod_cmd) {
                const [disabled_cmds, disabled_cats, disabled_cmd_chs] = await Promise.all([
                    this.disabled_commands.findOne({
                        guildId: context.guild.id,
                        commands: {
                            $all: [cmd_name],
                        },
                    }),
                    this.disabled_categories.findOne({
                        guildId: context.guild.id,
                        categories: {
                            $all: [command.category.id],
                        },
                    }),
                    this.disabled_commands_channels.findOne({
                        guildId: context.guild.id,
                        command: cmd_name,
                        channels: {
                            $all: [context.channel.id],
                        },
                    }),
                ]);

                if (disabled_cmds) return false;
                if (disabled_cats) return false;
                if (disabled_cmd_chs) return false;
            }

            if (!context.member) return false;

            if (!context.channel.nsfw && command.explicit) return false;
        }

        if (!command.permissions.test(context.member || context.author)) {
            await command.noPermission(context);
            return false;
        }

        if (!this.global_ratelimit.testAndAdd(context.author.id)) {
            await this.rateLimit(context);
            return false;
        }

        if (command.rateLimiter && !command.rateLimiter.testAndAdd(context.author.id)) {
            await command.rateLimit(context);
            return false;
        }

        // good to send help when using `command help` and `help command`
        if (is_command && /^(help|usage)$/i.test(splitArgs(context.content, 2)[0])) {
            log.debug("Command", debugString("help", context));

            await HelpBuilder.sendHelp(context, cmd_name, command);
        } else {
            if (is_command) log.debug("Command", debugString(cmd_name, context));
            else log.debug("Keyword", debugString(cmd_name, context));

            await command.run(context, cmd_name);
        }

        return true;
    }
}

module.exports = CommandDispatcher;
