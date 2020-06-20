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

const log = require("../log").default.namespace("processor");
const INFO = require("../info").default;
const { splitArgs } = require("../util/string");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { default: BotStatsManager, COMMANDS_EXECUTED, MESSAGES_TODAY } = require("./managers/BotStatsManager");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GuildStatsManager = require("./managers/GuildStatsManager").default;
const ErrorCaseManager = require("./managers/ErrorCaseManager").default;
const CommandRegistry = require("./CommandRegistry").default;
const CommandDispatcher = require("./CommandDispatcher").default;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ConfigManager = require("./managers/ConfigManager");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LocaleManager = require("./managers/LocaleManager").default;
const MessageContext = require("../util/commands/MessageContext").default;
const timer = require("../modules/timer").default;
const Discord = require("discord.js");

const Translation = require("../modules/i18n/Translation").default;
const TranslationMerge = require("../modules/i18n/TranslationMerge").default;

class CommandProcessor {
    /**
     * @param {Discord.Client} client
     * @param {ConfigManager} config
     * @param {LocaleManager} locale
     * @param {BotStatsManager} bot_stats
     * @param {GuildStatsManager} guild_stats
     * @param {*} db
     */
    constructor(client, config, locale, bot_stats, guild_stats, db) {
        this.client = client;
        this.config = config;
        this.locale = locale;
        this.db = db;
        this.bot_stats = bot_stats;
        this.guild_stats = guild_stats;

        this.error_cases = new ErrorCaseManager(this.db);

        this.REGISTRY = new CommandRegistry(client, this.db);
        this.DISPATCHER = new CommandDispatcher(client, this.db, this.REGISTRY);

        this.guild_stats.registerCounter("commands");
        this.guild_stats.registerCounter("messages");

        this.me_regex = new RegExp(`^<@!?${this.client.user.id}> `);
    }

    /**
     * @param {Discord.Message} message
     * @param {string} prefix
     * @param {Error} err
     * @returns {Promise<void>}
     */
    async onProcessingError(message, prefix, err) {
        const caseId = await this.error_cases.collectInfo(message, err);

        log.error([
            "ProcessingError {",
            "  caseID:      " + caseId,
            "  content:     " + JSON.stringify(message.content),
            "  channelType: " + message.channel.type,
            message.guild && "  guildId:     " + message.guild.id,
            "  channelId:   " + message.channel.id,
            "  userId:      " + message.author.id,
            "  error:      ",
        ].filter(s => !!s).join("\n"), err, "}");

        const err_message = new Translation(
            "general.error",
            "Uh... I think... I might've run into a problem there...?\nIf you believe this is unintended behaviour, report the error with `{{prefix}}reporterror {{caseId}}`",
            { prefix: prefix || "!", caseId }
        );

        try {
            if (INFO.DEV) {
                await this.locale.send(message.channel, new TranslationMerge(err_message, `\n\`${err.name}: ${err.message}\``));
            } else {
                await this.locale.send(message.channel, err_message);
            }
        } catch (_) { _; } // doesn't have permissions to send. Uninteresting to us
    }

    /**
     * @param {Discord.Message} message
     */
    async onMessage(message) {
        const received_at = timer();

        if (message.author.bot || message.author.equals(message.client.user)) return;

        this.bot_stats.inc(MESSAGES_TODAY, 1, true);
        if (message.channel.type === "text") this.guild_stats.get("messages").add(new Date(), message.guild.id, message.channel.id, message.author.id);

        if (message.channel.type === "text" &&
            !message.channel.permissionsFor(message.guild.me)?.has(Discord.Permissions.FLAGS.SEND_MESSAGES, true))
            return;

        let raw_content = message.content;

        // remove prefix
        let prefix = "";
        let prefix_used = true;

        try {
            let config = null;
            if (message.guild) {
                config = await this.config.get(message.guild.id);

                prefix = config.prefix;
            }

            // check prefixes
            if (this.me_regex.test(raw_content)) {
                const i = raw_content.indexOf(" "); // RegEx includes space after @mention, therefore look for first space
                raw_content = raw_content.substr(i + 1);
            } else if (raw_content.startsWith(prefix)) {
                raw_content = raw_content.substr(prefix.length);
            } else {
                prefix_used = false;
            }

            const [command_name_raw, content] = prefix_used ? splitArgs(raw_content, 2) : ["", raw_content];
            const command_name = command_name_raw.toLowerCase();

            const ctx = new MessageContext({
                message: message,
                locale: this.locale,
                config: config,
                content: content,
                prefix: prefix,
                prefix_used: prefix_used,
                received_at: received_at,
            });

            const executed = await this.DISPATCHER.process(ctx, command_name);
            if (!executed) return;

            this.bot_stats.inc(COMMANDS_EXECUTED, 1, true);

            if (message.guild) {
                await this.guild_stats.get("commands").add(new Date(), message.guild.id, message.channel.id, message.author.id, command_name);
            }
        } catch (err) {
            await this.onProcessingError(message, prefix, err);
        }
    }
}

module.exports = CommandProcessor;
