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

const CONST = require("../const").default;
const Discord = require("discord.js");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");

const { userToString } = require("../util/util");

module.exports = function install(cr) {
    cr.registerCommand("whois", new SimpleCommand(({ message, mentions }) => {
        const member = mentions.members.first() || message.member;

        const embed = new Discord.MessageEmbed().setColor(CONST.COLOR.PRIMARY);

        embed.setAuthor(userToString(member, true), member.user.avatarURL({ size: 32, dynamic: true }));
        embed.setThumbnail(member.user.avatarURL({ size: 256, dynamic: true }));

        if (member.user.bot) embed.addField("Is Bot", "✅");
        embed.addField("ID", member.user.id, true);
        if (member.nickname) embed.addField("Nickname", member.nickname, true);
        embed.addField("Status", member.presence.status, true);
        if (member.presence.activities.length) embed.addField("Activity", member.presence.activities.map(a => {
            // 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING' | 'CUSTOM_STATUS'
            let str = "";
            if (a.type === "CUSTOM_STATUS") {
                str = "**Custom**: ";
                if (a.emoji) str += a.emoji.toString() + " ";
                if (a.state) str += a.state + " ";
                return str;
            }

            switch (a.type) {
                case "PLAYING": str = "**Playing**: "; break;
                case "STREAMING": str = "**Streaming**: "; break;
                case "LISTENING": str = "**Listening**: "; break;
                case "WATCHING": str = "**Watching**: "; break;
            }
            if (a.name) str += `${a.name} `;
            if (a.details) str += "\n  " + a.details + " ";
            if (a.state) str += "\n  " + a.state + " ";
            if (a.url) str += "\n  " + a.url;
            return str;
        }).join("\n"), true);
        embed.addField("Registered", member.user.createdAt.toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC", true);
        embed.addField("Joined", member.joinedAt.toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC", true);
        if (member.roles.highest) embed.addField("Highest Role", member.roles.highest.toString(), true);

        return { embed };
    }))
        .setHelp(new HelpContent()
            .setDescription("Receive information about a user or about yourself")
            .setUsage("<@user>")
            .addParameterOptional("@user", "If given, return info about that user, otherwise return info about yourself"))
        .setCategory(Category.INFO);
};
