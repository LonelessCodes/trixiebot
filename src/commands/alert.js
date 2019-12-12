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
const Resolvable = require("../modules/i18n/Resolvable");

const AlertManager = require("../modules/alert/AlertManager");
const PicartoProcessor = require("../modules/alert/processor/PicartoProcessor");
const PiczelProcessor = require("../modules/alert/processor/PiczelProcessor");
const SmashcastProcessor = require("../modules/alert/processor/SmashcastProcessor");
const TwitchProcessor = require("../modules/alert/processor/TwitchProcessor");

const { findChannels } = require("../modules/alert/helpers");
const StreamConfig = require("../modules/alert/stream/StreamConfig");

const URL_REGEX = /^(https?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)$/;

module.exports = function install(cr, { client, locale, db }) {
    const services = [
        PicartoProcessor,
        PiczelProcessor,
        SmashcastProcessor,
    ];
    if (config.has("twitch.client_id")) services.push(TwitchProcessor);
    else log.namespace("config", "Found no API client ID for Twitch - Disabled alerting Twitch streams");

    const manager = new AlertManager(db, locale, client, services);

    const alertCommand = cr.registerCommand("alert", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Make Trixie announce streamers when they go live.\nSupported are Picarto, Piczel, Twitch and Smashcast.")
            .addUsage("<stream url>", "Subscribe Trixie to a streaming channel!")
            .addUsage("<stream url> <#channel>", "Post to a given channel")
            .addUsage("<stream url> sfw:<#channel>", "Post only SFW streams to the given channel")
            .addUsage("<stream url> nsfw:<#channel>", "Post only NSFW streams to the given channel")
            .addUsage("<stream url> sfw:<#ch> nsfw:<#ch>", "Post SFW and NSFW streams into seperate channels"))
        .setCategory(Category.UTIL)
        .setPermissions(new CommandPermission([Discord.Permissions.FLAGS.MANAGE_CHANNELS]));

    /**
     * SUB COMMANDS
     */

    const list_command = new SimpleCommand(async message => {
        const streams = await manager.getStreamConfigs(message.guild);

        if (streams.length === 0) {
            return new Translation("alert.empty", "Hehe, nothing here lol. Time to add some.");
        }

        /** @type {Map<any, Channel>} */
        const sorted_by_channels = new Map;
        for (const stream of streams) {
            if (stream.channel) {
                sorted_by_channels.set(stream.channel, [...sorted_by_channels.get(stream.channel) || [], stream.getURL(true)]);
            } else {
                if (stream.nsfwChannel) {
                    sorted_by_channels.set(stream.nsfwChannel, [...sorted_by_channels.get(stream.nsfwChannel) || [], stream.getURL(true) + " (NSFW)"]);
                }
                if (stream.sfwChannel) {
                    sorted_by_channels.set(stream.sfwChannel, [...sorted_by_channels.get(stream.sfwChannel) || [], stream.getURL(true) + " (SFW)"]);
                }
            }
        }

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        for (const [channel, streams] of sorted_by_channels) {
            let str = "";
            for (const stream of streams) str += stream + "\n";

            embed.addField("#" + channel.name, str);
        }

        return embed;
    });

    alertCommand.registerSubCommand("list", list_command)
        .setHelp(new HelpContent().setUsage("", "list all active streaming alerts"));

    alertCommand.registerDefaultCommand(new OverloadCommand)
        .registerOverload("0", list_command)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const [first, ...args_arr] = content.trim().split(/\s+/);

            const url = first.replace(/<.*>/, str => str.slice(1, str.length - 1)); // clean links
            if (url === "") {
                return new Translation("alert.url_missing", "`page url` should be a vaid url! Instead I got nothing");
            }
            if (!URL_REGEX.test(url)) {
                return new Translation("alert.invalid_url", "`page url` should be a vaid url! Instead I got a lousy \"{{url}}\"", { url });
            }

            const service = manager.getService(url);
            if (!service) {
                return new Translation("alert.unknown_service", "MMMMMMMMMMMMHHHHHHHH I don't know this website :c");
            }

            const parsed = await service.parseStreamer(url);
            if (!parsed.username) {
                return new Translation("alert.page_missing", "You should also give me your channel page in the url instead of just the site!");
            }
            if (!parsed.userId) {
                return new Translation("alert.no_exist", "That user does not exist!");
            }

            const savedConfig = await manager.getStreamConfig(message.guild, parsed);
            if (savedConfig) {
                return new Translation("alert.already_subscribed", "This server is already subscribed to this streamer.");
            }

            const final_channels = findChannels(message, args_arr);
            if (final_channels instanceof Resolvable) {
                return final_channels;
            }

            await manager.addStreamConfig(new StreamConfig(
                service, final_channels.def, final_channels.nsfw, final_channels.sfw, parsed
            ));

            return new Translation("alert.success", "Will be alerting y'all there when {{name}} goes online!", {
                name: parsed.username,
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

            const service = manager.getService(url);
            if (!service) {
                return new Translation("alert.unknown_service", "MMMMMMMMMMMMHHHHHHHH I don't know this website :c");
            }

            const parsed = await service.parseStreamer(url);
            if (!parsed.username) {
                return new Translation("alert.page_missing", "You should also give me your channel page in the url instead of just the site!");
            }

            const savedConfig = await manager.getStreamConfig(message.guild, parsed);
            if (!savedConfig) {
                return new Translation("alert.not_subscribed", "I was not subscribed to this streamer.");
            }

            await manager.removeStreamConfig(savedConfig);

            return new Translation("alert.remove_success", "Stopped alerting for {{name}}", {
                name: parsed.username,
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
