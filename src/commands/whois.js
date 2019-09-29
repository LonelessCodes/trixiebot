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

const CONST = require("../const");
const Discord = require("discord.js");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");

const { userToString } = require("../util/util");

module.exports = function install(cr) {
    cr.registerCommand("whois", new SimpleCommand(({ message, mentions }) => {
        const member = mentions.members.first() || message.member;

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

        embed.setAuthor(userToString(member, true), member.user.avatarURL);
        embed.setThumbnail(member.user.avatarURL);

        if (member.user.bot) embed.addField("Is Bot", "✅");
        embed.addField("ID", member.user.id, true);
        if (member.nickname) embed.addField("Nickname", member.nickname, true);
        embed.addField("Status", member.user.presence.status, true);
        if (member.user.presence.game) embed.addField("Game", member.user.presence.game, true);
        embed.addField("Registered", member.user.createdAt.toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC", true);
        embed.addField("Joined", member.joinedAt.toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC", true);
        if (member.highestRole) embed.addField("Highest Role", member.highestRole, true);

        return { embed };
    }))
        .setHelp(new HelpContent()
            .setDescription("Receive information about a user or about yourself")
            .setUsage("<@user>")
            .addParameterOptional("@user", "If given, return info about that user, otherwise return info about yourself"))
        .setCategory(Category.INFO);
};
