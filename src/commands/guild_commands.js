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

const CONST = require("../const").default;

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;

const { basicTEmbed } = require("../modules/i18n/TranslationEmbed");

const Translation = require("../modules/i18n/Translation").default;
const TranslationPlural = require("../modules/i18n/TranslationPlural").default;
const TranslationEmbed = require("../modules/i18n/TranslationEmbed").default;
const TranslationMerge = require("../modules/i18n/TranslationMerge").default;
const NumberFormat = require("../modules/i18n/NumberFormat").default;
const ListFormat = require("../modules/i18n/ListFormat").default;
const CalendarTimeFormat = require("../modules/i18n/CalendarTimeFormat").default;

function sort(data) {
    return data
        .map(entry => {
            entry.ts = entry.ts.getTime();
            return entry;
        })
        .sort((a, b) => (b.ts > a.ts ? -1 : b.ts < a.ts ? 1 : 0));
}

function findFirstIndex(arr, cb) {
    for (let i = 0; i < arr.length; i++) {
        if (cb(arr[i])) return i;
    }
    return arr.length;
}

// eslint-disable-next-line valid-jsdoc
/**
 * @param {Date} start_d
 * @param {Date|null} [end_d]
 * @param {{ ts: Date, value: number }[][]} [param2]
 * @returns {ListFormat}
 */
function getString(start_d, end_d, [commands = [], messages = [], users = []]) {
    const start = start_d.getTime();
    const end = end_d && end_d.getTime();

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
    if (cmds_total)
        list.push(new TranslationPlural("stats.commands", ["{{count}} Command", "{{count}} Commands"], { count: cmds_total }));

    const joined_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.added, 0);
    const left_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.removed, 0);

    if (joined_users > 0 || left_users > 0)
        list.push(new Translation("stats.users", "{{count}} Users", { count: `+${joined_users}/-${left_users}` }));

    return list;
}

// eslint-disable-next-line valid-jsdoc
/**
 * @param {Date} start_d
 * @param {number} divider
 * @param {{ ts: Date, value: number }[][]} param2
 * @returns {ListFormat}
 */
function getAverageString(start_d, divider, [commands = [], messages = [], users = []]) {
    const start = start_d.getTime();

    const findIndex = entry => entry.ts > start;

    if (commands.length) commands = commands.slice(findFirstIndex(commands, findIndex));
    if (messages.length) messages = messages.slice(findFirstIndex(messages, findIndex));
    if (users.length) users = users.slice(findFirstIndex(users, findIndex));

    const list = new ListFormat();

    const msgs_total = messages.reduce((sum, entry) => sum + entry.value, 0) / divider;
    list.push(
        new TranslationPlural("stats.messages", ["{{count}} Message", "{{count}} Messages"], { count: msgs_total.toFixed(2) })
    );

    const cmds_total = commands.reduce((sum, entry) => sum + entry.value, 0) / divider;
    if (cmds_total)
        list.push(
            new TranslationPlural("stats.commands", ["{{count}} Command", "{{count}} Commands"], { count: cmds_total.toFixed(2) })
        );

    const joined_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.added, 0);
    const left_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.removed, 0);

    if (joined_users > 0 || left_users > 0)
        list.push(
            new Translation("stats.users", "{{count}} Users", {
                count: `+${(joined_users / divider).toFixed(2)}/-${(left_users / divider).toFixed(2)}`,
            })
        );

    return list;
}

function generateTimeFrames() {
    const now = new Date();

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

module.exports = function install(cr, { guild_stats }) {
    cr.registerCommand(
        "stats",
        new SimpleCommand(async message => {
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
            if (results[3] && results[3].ts.getTime() < quartal.getTime())
                embed.addField(new Translation("stats.avg_90d", "Average (90 days)"), getAverageString(quartal, 90, results));

            return { embed };
        })
    )
        .setHelp(new HelpContent().setUsage("", "Get some stats about the alive-ness of this server"))
        .setCategory(Category.INFO);

    cr.registerCommand(
        "userstats",
        new SimpleCommand(async ({ message, mentions }) => {
            const user = mentions.members?.first() || message.member || message.author;

            const guildId = message.guild.id;

            const { today, yesterday, week, month, quartal } = generateTimeFrames();

            const results = await Promise.all([
                guild_stats.get("commands").getRangeUser(quartal, null, guildId, user.id).then(sort),
                guild_stats.get("messages").getRangeUser(quartal, null, guildId, user.id).then(sort),
            ]);

            const embed = basicTEmbed(new Translation("stats.statistics", "Statistics"), user);

            embed.addField(new Translation("stats.today", "Today"), getString(today, null, results), true);
            embed.addField(new Translation("stats.yesterday", "Yesterday"), getString(yesterday, today, results), true);

            embed.addField(new Translation("stats.avg_7d", "Average (7 days)"), getAverageString(week, 7, results));
            embed.addField(new Translation("stats.avg_30d", "Average (30 days)"), getAverageString(month, 30, results));
            embed.addField(new Translation("stats.avg_90d", "Average (90 days)"), getAverageString(quartal, 90, results));

            return { embed };
        })
    )
        .setHelp(
            new HelpContent()
                .setUsage("<?@user>", "Get some stats about how active someone is on the server")
                .addParameterOptional("@user", "The member c:")
        )
        .setCategory(Category.INFO);

    cr.registerCommand(
        "serverinfo",
        new SimpleCommand(message => {
            const embed = new TranslationEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setTitle(new TranslationMerge(message.guild.name, new Translation("stats.statistics", "Statistics")));

            const icon_url = message.guild.iconURL({ size: 256, dynamic: true });
            if (icon_url) embed.setThumbnail(icon_url);

            if (message.guild.owner) embed.addField("Owner", message.guild.owner.user.tag, true);
            embed.addField("ID", message.guild.id, true);
            embed.addField("User Count", new NumberFormat(message.guild.memberCount), true);
            embed.addField("Creation Time", new TranslationMerge(new CalendarTimeFormat(message.guild.createdAt), "UTC"), true);
            embed.addField("Channel Count", new NumberFormat(message.guild.channels.cache.filter(c => c.type === "text").size), true);
            embed.addField("Emoji Count", new NumberFormat(message.guild.emojis.cache.size), true);
            embed.addField("Region", message.guild.region, true);

            return { embed };
        })
    )
        .setHelp(new HelpContent().setUsage("", "Receive information about this server"))
        .setCategory(Category.INFO);
};
