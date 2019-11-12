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

const log = require("../log").namespace("registry");
const { isOwner } = require("../util/util");
const { splitArgs } = require("../util/string");
const { toHumanTime } = require("../util/time");
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
// eslint-disable-next-line no-unused-vars
const MessageContext = require("../util/commands/MessageContext");

const Translation = require("../modules/i18n/Translation");
const TranslationPlural = require("../modules/i18n/TranslationPlural");

/**
 * @param {string} command_name
 * @param {MessageContext} context
 * @returns {string}
 */
function debugString(command_name, context) {
    switch (context.channel.type) {
        case "text": return `command:${command_name}, user:${context.author.username}#${context.author.discriminator}, userid:${context.author.id}, guild:${context.guild.id}, channel:${context.channel.id}`;
        default: return `command:${command_name}, user:${context.author.username}#${context.author.discriminator}, userid:${context.author.id}, c_type:${context.channel.type}, channel:${context.channel.id}`;
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

    async rateLimit(context, command_name) {
        if (!this.global_ratelimit_message.testAndAdd(`${command_name}:${context.guild.id}:${context.channel.id}`)) return;

        await context.send(new TranslationPlural("command.ratelimit", [
            "Whoa whoa not so fast! You may only do this {{count}} time every {{time_frame}}. " +
            "There is still {{time_left}} left to wait.",
            "Whoa whoa not so fast! You may only do this {{count}} times every {{time_frame}}. " +
            "There is still {{time_left}} left to wait.",
        ], {
            count: this.global_ratelimit.max,
            time_frame: this.global_ratelimit.timeUnit.toTranslation(this.global_ratelimit.timeNum),
            time_left: toHumanTime(this.global_ratelimit.tryAgainIn(context.author.id)),
        }));
    }

    /**
     * @param {MessageContext} ctx
     * @param {string} command_name
     */
    async process(ctx, command_name) {
        const { message, channel, guild, prefix_used } = ctx;

        if (channel.type === "text") {
            /** @type {CustomCommand} */
            const cc = await this.REGISTRY.CC.get(guild, { command_name, prefix_used, raw_content: message.content });
            if (cc && cc.enabled) return await this.processCC(ctx, command_name, cc);
        }

        /** @type {BaseCommand} */
        const command = this.REGISTRY.getCommand(command_name);
        if (command) return await this.processCommand(ctx, command_name, command, null);

        /** @type {[RegExp|string, BaseCommand]} */
        const keyword = this.REGISTRY.getKeyword(message.content);
        if (keyword) return await this.processCommand(ctx, command_name, keyword[1], keyword[0]);

        await this.processCommand(ctx, command_name, null, null);
    }

    /**
     * @param {MessageContext} context
     * @param {string} command_name
     * @param {CustomCommand} command
     */
    async processCC(context, command_name, command) {
        if (context.guild && !context.member) context.guild.member = context.guild.member(context.author) || null;
        if (!context.member) return false;

        if (await this.blacklisted_users.has(context.author.id)) {
            await context.send(new Translation("general.blacklisted", "You have been blacklisted from using all of Trixie's functions. " +
                "If you wish to get more details on why, don't hesitate to join the support server and ask, but be sincere."));
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

        if (this.global_ratelimit && !this.global_ratelimit.testAndAdd(context.author.id)) {
            await this.rateLimit(context, command.id);
            return false;
        }

        log.debug("CustomC", `command:${command.id}, user:${context.author.username}#${context.author.discriminator}, userid:${context.author.id}, guild:${context.guild.id}, channel:${context.channel.id}`);

        await command.run(context, command_name);

        return true;
    }

    /**
     * @param {MessageContext} context
     * @param {string} command_name
     * @param {BaseCommand} command
     * @param {string|RegExp} keyword
     * @returns {boolean}
     */
    async processCommand(context, command_name, command, keyword) {
        const c_type = context.channel.type;
        const is_guild = c_type === "text";

        if (command && command instanceof AliasCommand) {
            command_name = command.parentName;
            command = command.command;
        }

        if (command && !command.hasScope(context.channel)) return;
        if (command && !command.isInSeason()) return;

        // is the case of cases, Owner should be able to use Owner commands everywhere, regardless of timeouts and other problems
        const isOwnerCommand = command && command.category && command.category === Category.OWNER && isOwner(context.author);

        if (command && command.ignore && !isOwnerCommand) {
            if (!keyword && await this.blacklisted_users.has(context.author.id)) {
                await context.send(new Translation("general.blacklisted", "You have been blacklisted from using all of Trixie's functions. " +
                    "If you wish to get more details on why, don't hesitate to join the support server and ask, but be sincere."));
                return false;
            }

            if (is_guild) {
                if (!keyword) {
                    const [disabledCommands, disabledChannels, disabledCommandChannels] = await Promise.all([
                        this.disabled_commands.findOne({
                            guildId: context.guild.id,
                            commands: {
                                $all: [command_name],
                            },
                        }),
                        this.disabled_channels.findOne({
                            guildId: context.guild.id,
                            channels: {
                                $all: [context.channel.id],
                            },
                        }),
                        this.disabled_commands_channels.findOne({
                            guildId: context.guild.id,
                            command: command_name,
                            channels: {
                                $all: [context.channel.id],
                            },
                        }),
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
                        guildId: context.guild.id,
                        channels: {
                            $all: [context.channel.id],
                        },
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
            if (!cmd.hasScope(context.channel)) continue;
            promises.set(cmd.id, cmd.beforeProcessCall(context));
        }

        if (!command) return false;
        if (!context.prefix_used && !keyword) return false;

        if (is_guild) {
            // eslint-disable-next-line require-atomic-updates
            if (!context.member) context.message.member = context.guild.member(context.author) || null;

            if (!context.member) return false;

            if (!context.channel.nsfw && command.explicit) return false;

            if (!isOwnerCommand && !CommandPermission.ADMIN.test(context.member) && command.ignore) {
                const timeouted = await this.timeout.findOne({ guildId: context.guild.id, memberId: context.author.id });
                if (timeouted) return false;
            }
        }

        if (!command.permissions.test(context.member || context.author)) {
            await command.noPermission(context);
            return false;
        }

        if (this.global_ratelimit && !this.global_ratelimit.testAndAdd(context.author.id)) {
            await this.rateLimit(context, command_name);
            return false;
        }

        if (command.rateLimiter && !command.rateLimiter.testAndAdd(context.author.id)) {
            await command.rateLimit(context);
            return false;
        }

        // good to send help when using `command help` and `help command`
        if (/^(help|usage)$/i.test(splitArgs(context.content, 2)[0]) && !keyword) {
            log.debug("Command", debugString("help", context));

            await HelpBuilder.sendHelp(context, command_name, command);

            await Promise.all(promises.values());

            return true;
        } else {
            if (!keyword) log.debug("Command", debugString(command_name, context));
            else log.debug("Keyword", debugString(keyword, context));

            const pass_through = await promises.get(command.id);

            await command.run(context, command_name, pass_through);

            await Promise.all(promises.values());

            return true;
        }
    }
}

module.exports = CommandDispatcher;
