const CONST = require("../const");
const Discord = require("discord.js");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");

const MessageMentions = require("../util/commands/MessageMentions");
const guild_stats = require("../core/managers/GuildStatsManager");
const { basicEmbed } = require("../util/util");

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
    let str = "";

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

    str += `${messages.reduce((sum, entry) => sum + entry.value, 0)} Messages`;

    const commands_total = commands.reduce((sum, entry) => sum + entry.value, 0);
    if (commands_total) str += ` and ${commands_total} Commands`;

    const joined_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.added, 0);
    const left_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.removed, 0);

    if (joined_users > 0 || left_users > 0) str += ` and +${joined_users}/-${left_users} Users`;

    return str;
}

// eslint-disable-next-line valid-jsdoc
/**
 * @param {Date} start
 * @param {number} divider
 * @param {{ ts: Date, value: number }[][]} param2
 * @returns {string}
 */
function getAverageString(start, divider, [commands = [], messages = [], users = []]) {
    let str = "";

    start = start.getTime();

    const findIndex = entry => entry.ts > start;

    if (commands.length) commands = commands.slice(findFirstIndex(commands, findIndex));
    if (messages.length) messages = messages.slice(findFirstIndex(messages, findIndex));
    if (users.length) users = users.slice(findFirstIndex(users, findIndex));

    str += `${(messages.reduce((sum, entry) => sum + entry.value, 0) / divider).toFixed(2)} Messages`;

    const commands_total = commands.reduce((sum, entry) => sum + entry.value, 0) / divider;
    str += ` and ${commands_total.toFixed(2)} Commands`;

    const joined_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.added, 0);
    const left_users = users.reduce((accumulator, currentValue) => accumulator + currentValue.removed, 0);

    if (joined_users > 0 || left_users > 0) str += ` and +${(joined_users / divider).toFixed(2)}/-${(left_users / divider).toFixed(2)} Users`;

    return str;
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

        const embed = basicEmbed(await message.channel.translate("Statistics"), message.guild);

        embed.addField("Today", getString(today, null, results), true);
        embed.addField("Yesterday", getString(yesterday, today, results), true);

        embed.addField("Average (7 days)", getAverageString(week, 7, results));
        embed.addField("Average (30 days)", getAverageString(month, 30, results));
        if (results[3] && results[3].ts.getTime() < quartal.getTime()) embed.addField("Average (90 days)", getAverageString(quartal, 90, results));

        return { embed };
    }))
        .setHelp(new HelpContent()
            .setDescription("Get some stats about the alive-ness of this server"))
        .setCategory(Category.INFO);

    cr.registerCommand("userstats", new SimpleCommand(async (message, content) => {
        const mentions = new MessageMentions(content, message.guild);
        const member = mentions.members.first() || message.member;
        const user = member.user;

        const guildId = message.guild.id;

        const { today, yesterday, week, month, quartal } = generateTimeFrames();

        const results = await Promise.all([
            guild_stats.get("commands").getRangeUser(quartal, null, guildId, user.id).then(sort),
            guild_stats.get("messages").getRangeUser(quartal, null, guildId, user.id).then(sort),
        ]);

        const embed = basicEmbed(await message.channel.translate("Statistics"), member);

        embed.addField("Today", getString(today, null, results), true);
        embed.addField("Yesterday", getString(yesterday, today, results), true);

        embed.addField("Average (7 days)", getAverageString(week, 7, results));
        embed.addField("Average (30 days)", getAverageString(month, 30, results));
        embed.addField("Average (90 days)", getAverageString(quartal, 90, results));

        return { embed };
    }))
        .setHelp(new HelpContent()
            .setDescription("Get some stats about how active someone is on the server")
            .setUsage("<?@user>", "")
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
        .setHelp(new HelpContent()
            .setDescription("Receive information about this server"))
        .setCategory(Category.INFO);
};
