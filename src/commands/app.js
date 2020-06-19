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

const INFO = require("../info").default;
const CONST = require("../const").default;

const url = require("url");

const TextCommand = require("../core/commands/TextCommand");
const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const CommandScope = require("../util/commands/CommandScope").default;

const Translation = require("../modules/i18n/Translation").default;
const TranslationMerge = require("../modules/i18n/TranslationMerge").default;
const TranslationEmbed = require("../modules/i18n/TranslationEmbed").default;

module.exports = function install(cr, { client }) {
    cr.registerCommand("donate", new TextCommand("https://ko-fi.com/loneless ❤"))
        .setHelp(new HelpContent()
            .setDescription("**TrixieBot costs $12 a month and a lot of time to maintain.**\nIf you like this bot, please consider giving the devs a little tip ❤"))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand("version", new TextCommand(`v${INFO.VERSION}`))
        .setHelp(new HelpContent().setDescription("Returns the currently running version of TrixieBot"))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("version", "v");

    if (INFO.INVITE)
        cr.registerCommand("invite", new TextCommand(INFO.INVITE))
            .setHelp(new HelpContent().setDescription("Gives a link to invite TrixieBot to your own server."))
            .setCategory(Category.TRIXIE)
            .setScope(CommandScope.ALL);

    cr.registerCommand("vote", new TextCommand(":eyes: https://discordbots.org/bot/397037692963258368/vote"))
        .setHelp(new HelpContent().setDescription("Vote for TrixieBot on bot listing sites! Pls"))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand("github", new TextCommand(
        new Translation(
            "general.github",
            "Help the development of TrixieBot on <https://github.com/LonelessCodes/trixiebot> :heart::heart::heart:"
        )
    ))
        .setHelp(new HelpContent().setDescription("Get a link to TrixieBot's Github repo."))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand("reportbug", new TextCommand(
        new Translation(
            "general.report_bug",
            "Report bugs and submit feature requests at <https://github.com/LonelessCodes/trixiebot/issues>"
        )
    ))
        .setHelp(new HelpContent().setDescription("Get a link to Trixie's bug report page."))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand("trixie", new SimpleCommand(({ message, prefix }) => {
        const desc = new TranslationMerge(
            new Translation(
                "general.introduction",
                "👋 **__Hey, I'm TrixieBot,__**\n\n" +
                "a creative community oriented bot for your server. I focus on providing powerful features instead of cluttering your chat.\n" +
                "I have many commands to engage with creative content, customize my behaviour, analyse server activity or just to help out.\n\n" +
                "For a list and usage of commands, use `{{prefix}}help`.",
                { prefix }
            ),
            "\n\n"
        );

        if (INFO.WEBSITE) {
            const host = url.parse(INFO.WEBSITE).host;
            let links =
                `**📘 Getting Started**: [${host}/get-started](${INFO.WEBSITE}/get-started)\n` +
                `**🌐 Website**: [${host}](${INFO.WEBSITE})\n`;
            if (message.guild)
                links +=
                    `**🔧 Web Dashboard**: [${host}/dashboard/${message.guild.id}](${INFO.WEBSITE}/dashboard/${message.guild.id})\n`;

            desc.push(links);
        }
        desc.push("**👩‍💻 Contributing**: [github.com/LonelessCodes/trixiebot](https://github.com/LonelessCodes/trixiebot)");

        return new TranslationEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setAuthor("TrixieBot", client.user.avatarURL({ size: 32, dynamic: true }), INFO.WEBSITE || undefined)
            .setDescription(desc.separator(""))
            .setFooter(`TrixieBot v${INFO.VERSION}`);
    }))
        .setHelp(new HelpContent().setDescription("First command to call."))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);
};
