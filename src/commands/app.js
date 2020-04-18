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

const INFO = require("../info");
const CONST = require("../const");

const TextCommand = require("../core/commands/TextCommand");
const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Translation = require("../modules/i18n/Translation");
const TranslationMerge = require("../modules/i18n/TranslationMerge");
const TranslationEmbed = require("../modules/i18n/TranslationEmbed");

module.exports = function install(cr, { client }) {
    cr.registerCommand("donate", new TextCommand("https://ko-fi.com/loneless ❤"))
        .setHelp(new HelpContent().setDescription("**TrixieBot costs $12 a month and a lot of time to maintain.**\nIf you like this bot, please consider giving the devs a little tip ❤"))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand("version", new TextCommand(`v${INFO.VERSION}`))
        .setHelp(new HelpContent().setDescription("Returns the currently running version of TrixieBot"))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("version", "v");

    if (INFO.INVITE) cr.registerCommand("invite", new TextCommand(INFO.INVITE))
        .setHelp(new HelpContent().setDescription("Gives a link to invite TrixieBot to your own server."))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand("vote", new TextCommand(":eyes: https://discordbots.org/bot/397037692963258368/vote"))
        .setHelp(new HelpContent().setDescription("Vote for TrixieBot on bot listing sites! Pls"))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand("trixie", new SimpleCommand(({ message, prefix }) => {
        const desc = new TranslationMerge;
        desc.push(new Translation(
            "general.introduction",
            "**Trixie is an all-in-one Discord Bot for pony lovers**\n\n" +
            "She offers a variety of great features, many of which to satisfy the needs of My Little Pony fans and server admins.\n\n" +
            "Her set of commands range from utility stuff, simple fun, imageboard commands, custom commands, soundboards, to even a full web dashboard to configure Trixie and watch the growth of your server and so much more!\n\n" +
            "For a list of all commands, go `{{prefix}}help`.",
            { prefix }
        ), "\n\n");
        if (INFO.WEBSITE) desc.push(
            "Website " + INFO.WEBSITE + "\n" +
            "Web Dashboard " + INFO.WEBSITE + (message.channel.type === "text" ? "/dashboard/" + message.guild.id : "/dashboard") + "\n"
        );
        desc.push("Contributing: https://github.com/LonelessCodes/trixiebot");

        return new TranslationEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setAuthor("TrixieBot", client.user.avatarURL({ size: 32, dynamic: true }), INFO.WEBSITE)
            .setDescription(desc.separator(""))
            .setFooter(`TrixieBot v${INFO.VERSION}`);
    }))
        .setHelp(new HelpContent().setDescription("First command to call."))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand("github", new TextCommand(new Translation("general.github", "Help the development of TrixieBot on <https://github.com/LonelessCodes/trixiebot> :heart::heart::heart:")))
        .setHelp(new HelpContent().setDescription("Get a link to TrixieBot's Github repo."))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand("reportbug", new TextCommand(new Translation("general.report_bug", "Report bugs and submit feature requests at <https://github.com/LonelessCodes/trixiebot/issues>")))
        .setHelp(new HelpContent().setDescription("Get a link to Trixie's bug report page."))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);
};
