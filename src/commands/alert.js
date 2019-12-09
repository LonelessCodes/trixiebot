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

const log = require("../log").namespace("alert cmd");
const CONST = require("../const");
const config = require("../config");
const Discord = require("discord.js");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandPermission = require("../util/commands/CommandPermission");

const Translation = require("../modules/i18n/Translation");

const AlertManager = require("../modules/alert/AlertManager");
const PicartoProcessor = require("../modules/alert/processor/PicartoProcessor");
const PiczelProcessor = require("../modules/alert/processor/PiczelProcessor");
const SmashcastProcessor = require("../modules/alert/processor/SmashcastProcessor");
const TwitchProcessor = require("../modules/alert/processor/TwitchProcessor");

const URL_REGEX = /^(https?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)$/;

module.exports = async function install(cr, { client, locale, db }) {
    const services = [
        PicartoProcessor,
        PiczelProcessor,
        SmashcastProcessor,
    ];
    if (config.has("twitch.client_id")) services.push(TwitchProcessor);
    else log.namespace("config", "Found no API client ID for Twitch - Disabled alerting Twitch streams");

    const manager = await new AlertManager(db, locale, client, services);

    const alertCommand = cr.registerCommand("alert", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Make Trixie announce streamers when they go live.\nSupported are Picarto, Piczel, Twitch and Smashcast.")
            .setUsage("<page url> <?channel>", "Subscribe Trixie to a streaming channel!")
            .addParameter("page url", "copy the url of the stream page and paste it in here")
            .addParameterOptional("channel", "the channel to post the alert to later. If omitted will be this channel"))
        .setCategory(Category.UTIL)
        .setPermissions(new CommandPermission([Discord.Permissions.FLAGS.MANAGE_CHANNELS]));

    /**
     * SUB COMMANDS
     */

    const list_command = new SimpleCommand(async message => {
        const s_channels = await manager.getChannels(message.guild);

        if (s_channels.length === 0) {
            return new Translation("alert.empty", "Hehe, nothing here lol. Time to add some.");
        }

        /** @type {Map<any, Channel>} */
        const sorted_by_channels = new Map;
        for (const s_channel of s_channels)
            sorted_by_channels.set(s_channel.channel, [...sorted_by_channels.get(s_channel.channel) || [], s_channel]);

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        for (const [g_channel, s_channels] of sorted_by_channels) {
            let str = "";
            for (const s_channel of s_channels) str += s_channel.getURL(true) + "\n";

            embed.addField("#" + g_channel.name, str);
        }

        return embed;
    });

    alertCommand.registerSubCommand("list", list_command)
        .setHelp(new HelpContent().setUsage("", "list all active streaming alerts"));

    alertCommand.registerDefaultCommand(new OverloadCommand)
        .registerOverload("0", list_command)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const g_channel = message.mentions.channels.first() || message.channel;

            const url = content
                .replace(new RegExp(g_channel.toString(), "g"), "")
                .replace(/<.*>/, str => str.slice(1, str.length - 1)) // clean links
                .trim();

            if (url === "") {
                return new Translation("alert.url_missing", "`page url` should be a vaid url! Instead I got nothing");
            }
            if (!URL_REGEX.test(url)) {
                return new Translation("alert.invalid_url", "`page url` should be a vaid url! Instead I got a lousy \"{{url}}\"", { url });
            }

            const config = await manager.parseConfig(g_channel, url);
            if (!config) {
                return new Translation("alert.unknown_service", "MMMMMMMMMMMMHHHHHHHH I don't know this website :c");
            }
            if (!config.name) {
                return new Translation("alert.page_missing", "You should also give me your channel page in the url instead of just the site!");
            }
            if (!config.userId) {
                return new Translation("alert.no_exist", "That user does not exist!");
            }
            if (config._id) {
                return new Translation("alert.already_subscribed", "This server is already subscribed to this streamer.");
            }

            await manager.addChannel(config);

            return new Translation("alert.success", "Will be alerting y'all there when {{name}} goes online!", {
                name: config.name,
            });
        }));

    alertCommand.registerSubCommand("remove", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const url = content
                .replace(/<.*>/, str => str.slice(1, str.length - 1)) // clean links
                .trim();

            if (!URL_REGEX.test(url)) {
                return new Translation("alert.invalid_url", "`page url` should be a vaid url! Instead I got a lousy \"{{url}}\"", { url });
            }

            const config = await manager.parseConfig(message.channel, url);
            if (!config) {
                return new Translation("alert.unknown_service", "MMMMMMMMMMMMHHHHHHHH I don't know this website :c");
            }
            if (!config.name) {
                return new Translation("alert.page_missing", "You should also give me your channel page in the url instead of just the site!");
            }
            if (!config.userId || !config._id) {
                return new Translation("alert.not_subscribed", "I was not subscribed to this streamer.");
            }

            await manager.removeChannel(config);

            return new Translation("alert.remove_success", "Stopped alerting for {{name}}", {
                name: config.name,
            });
        }))
        .setHelp(new HelpContent().setUsage("<page url>", "unsubscribe Trixie from a Picarto channel"));

    alertCommand.registerSubCommand("compact", new SimpleCommand(async message => {
        if (await manager.isCompact(message.guild)) {
            await manager.unsetCompact(message.guild);
            return new Translation("alert.compact_off", "Compact online announcements are now turned off.");
        } else {
            await manager.setCompact(message.guild);
            return new Translation("alert.compact_on", "Compact online announcements are now turned on.");
        }
    }))
        .setHelp(new HelpContent().setUsage("", "toggle compact online announcements"));

    alertCommand.registerSubCommand("cleanup", new SimpleCommand(async message => {
        if (await manager.isCleanup(message.guild)) {
            await manager.unsetCleanup(message.guild);
            return new Translation("alert.cleanup_off", "Not deleting online announcements when going offline now.");
        } else {
            await manager.setCleanup(message.guild);
            return new Translation("alert.cleanup_on", "Cleaning up online announcements now.");
        }
    }))
        .setHelp(new HelpContent().setUsage("", "toggle cleaning up online announcements"));

    alertCommand.registerSubCommandAlias("*", "add");
};
