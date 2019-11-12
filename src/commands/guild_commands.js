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

const guild_stats = require("../core/managers/GuildStatsManager");
const { basicTEmbed } = require("../util/util");

const Translation = require("../modules/i18n/Translation");
const TranslationPlural = require("../modules/i18n/TranslationPlural");
const ListFormat = require("../modules/i18n/ListFormat");

function sort(data) {
    return data.map(entry => {
        entry.ts = entry.ts.getTime();
        return entry;
    }).sort((a, b) =>
        b.ts > a.ts ?
            -1 :
            b.ts < a.ts ? 1 : 0
    );
}

function findFirstIndex(arr, cb) {
    for (let i = 0; i < arr.length; i++) {
        if (cb(arr[i])) return i;
    }
    return arr.length;
}

// eslint-disable-next-line valid-jsdoc
/**
 * @param {Date} start
 * @param {Date} end
 * @param {{ ts: Date, value: number }[][]} param2
 * @returns {string}
 */
function getString(start, end, [commands = [], messages = [], users = []]) {
    start = start.getTime();
    if (end) end = end.getTime();

    const findIndex = entry => entry.ts > start;
    const findIndexEnd = entry => entry.ts > end;

    if (commands.length) commands = commands.slice(findFirstIndex(commands, findIndex));
    if (messages.length) messages = messages.slice(findFirstIndex(messages, findIndex));
    if (users && users.length) users = users.slice(findFirstIndex(users, findIndex));

    if (end) {
        if (commands.length) commands = commands.slice(0, findFirstIndex(commands, findIndexEnd));
        if (messages.length) messages = messages.slice(0, findFirstIndex(messages, findIndexEnd));
        if (users && users.length) users = users.slice(0, findFirstIndex(users, findIndexEnd));
    }

    const list = new ListFormat();

    const msgs_total = messages.reduce((sum, entry) => sum + entry.value, 0);
    list.push(new TranslationPlural("stats.messages", ["{{count}} Message", "{{count}} Messages"], { count: msgs_total }));

    const cmds_total = commands.reduce((sum, entry) => sum + entry.value, 0);
    if (cmds_total) list.push(new TranslationPlural("stats.commands", ["{{count}} Command", "{{count}} Commands"], { count: cmds_total }));

    const joined_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.added, 0);
    const left_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.removed, 0);

    if (joined_users > 0 || left_users > 0) list.push(new Translation("stats.users", "{{count}} Users", { count: `+${joined_users}/-${left_users}` }));

    return list;
}

// eslint-disable-next-line valid-jsdoc
/**
 * @param {Date} start
 * @param {number} divider
 * @param {{ ts: Date, value: number }[][]} param2
 * @returns {string}
 */
function getAverageString(start, divider, [commands = [], messages = [], users = []]) {
    start = start.getTime();

    const findIndex = entry => entry.ts > start;

    if (commands.length) commands = commands.slice(findFirstIndex(commands, findIndex));
    if (messages.length) messages = messages.slice(findFirstIndex(messages, findIndex));
    if (users.length) users = users.slice(findFirstIndex(users, findIndex));

    const list = new ListFormat();

    const msgs_total = messages.reduce((sum, entry) => sum + entry.value, 0) / divider;
    list.push(new TranslationPlural("stats.messages", ["{{count}} Message", "{{count}} Messages"], { count: msgs_total.toFixed(2) }));

    const cmds_total = commands.reduce((sum, entry) => sum + entry.value, 0) / divider;
    if (cmds_total) list.push(new TranslationPlural("stats.commands", ["{{count}} Command", "{{count}} Commands"], { count: cmds_total.toFixed(2) }));

    const joined_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.added, 0);
    const left_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.removed, 0);

    if (joined_users > 0 || left_users > 0) list.push(new Translation("stats.users", "{{count}} Users", { count: `+${(joined_users / divider).toFixed(2)}/-${(left_users / divider).toFixed(2)}` }));

    return list;
}

function generateTimeFrames() {
    const now = new Date;

    const today = new Date(now);
    today.setHours(now.getHours() - 24);

    const yesterday = new Date(now);
    yesterday.setHours(now.getHours() - 48);

    const week = new Date(now);
    week.setHours(now.getHours() - (24 * 7));

    const month = new Date(now);
    month.setHours(now.getHours() - (30 * 24));

    const quartal = new Date(now);
    quartal.setHours(now.getHours() - (90 * 24));

    return { now, today, yesterday, week, month, quartal };
}

module.exports = function install(cr) {
    cr.registerCommand("stats", new SimpleCommand(async message => {
        const guildId = message.guild.id;

        const { today, yesterday, week, month, quartal } = generateTimeFrames();

        const results = await Promise.all([
            guild_stats.get("commands").getRange(quartal, null, guildId).then(sort),
            guild_stats.get("messages").getRange(quartal, null, guildId).then(sort),
            guild_stats.get("users").getRange(quartal, null, guildId).then(sort),

            guild_stats.get("users").getLastItemBefore(quartal, guildId),
        ]);

        const embed = basicTEmbed(new Translation("stats.statistics", "Statistics"), message.guild);

        embed.addField(new Translation("stats.today", "Today"), getString(today, null, results), true);
        embed.addField(new Translation("stats.yesterday", "Yesterday"), getString(yesterday, today, results), true);

        embed.addField(new Translation("stats.avg_7d", "Average (7 days)"), getAverageString(week, 7, results));
        embed.addField(new Translation("stats.avg_30d", "Average (30 days)"), getAverageString(month, 30, results));
        if (results[3] && results[3].ts.getTime() < quartal.getTime()) embed.addField(new Translation("stats.avg_90d", "Average (90 days)"), getAverageString(quartal, 90, results));

        return { embed };
    }))
        .setHelp(new HelpContent().setUsage("", "Get some stats about the alive-ness of this server"))
        .setCategory(Category.INFO);

    cr.registerCommand("userstats", new SimpleCommand(async ({ message, mentions }) => {
        const member = mentions.members.first() || message.member;
        const user = member.user;

        const guildId = message.guild.id;

        const { today, yesterday, week, month, quartal } = generateTimeFrames();

        const results = await Promise.all([
            guild_stats.get("commands").getRangeUser(quartal, null, guildId, user.id).then(sort),
            guild_stats.get("messages").getRangeUser(quartal, null, guildId, user.id).then(sort),
        ]);

        const embed = basicTEmbed(new Translation("stats.statistics", "Statistics"), member);

        embed.addField(new Translation("stats.today", "Today"), getString(today, null, results), true);
        embed.addField(new Translation("stats.yesterday", "Yesterday"), getString(yesterday, today, results), true);

        embed.addField(new Translation("stats.avg_7d", "Average (7 days)"), getAverageString(week, 7, results));
        embed.addField(new Translation("stats.avg_30d", "Average (30 days)"), getAverageString(month, 30, results));
        embed.addField(new Translation("stats.avg_90d", "Average (90 days)"), getAverageString(quartal, 90, results));

        return { embed };
    }))
        .setHelp(new HelpContent().setUsage("<?@user>", "Get some stats about how active someone is on the server")
            .addParameterOptional("@user", "The member c:"))
        .setCategory(Category.INFO);

    cr.registerCommand("serverinfo", new SimpleCommand(async message => {
        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        embed.setTitle(`${message.guild.name} ${await message.channel.translate("Statistics")}`);
        embed.setThumbnail(message.guild.iconURL);

        if (message.guild.owner) embed.addField("Owner", message.guild.owner.user.tag, true);
        embed.addField("ID", message.guild.id, true);
        embed.addField("User Count", message.guild.memberCount, true);
        embed.addField("Creation Time", message.guild.createdAt.toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC", true);
        embed.addField("Channel Count", message.guild.channels.filter(c => c.type === "text").size, true);
        embed.addField("Emoji Count", message.guild.emojis.size, true);
        embed.addField("Region", message.guild.region, true);

        return { embed };
    }))
        .setHelp(new HelpContent().setUsage("", "Receive information about this server"))
        .setCategory(Category.INFO);
};
