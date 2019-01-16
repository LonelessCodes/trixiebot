const log = require("../modules/log");
const CONST = require("../modules/CONST");
const Discord = require("discord.js");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

const guild_stats = require("../logic/managers/GuildStatsManager");

function sort(data) {
    return data.map(entry => {
        entry.timestamp = entry.timestamp.getTime();
        return entry;
    }).sort((a, b) => {
        return b.timestamp > a.timestamp
            ? -1
            : b.timestamp < a.timestamp
                ? 1
                : 0;
    });
}

function findFirstIndex(arr, cb) {
    for (let i = 0; i < arr.length; i++) {
        if (cb(arr[i])) return i;
    }
    return arr.length;
}

/**
 * 
 * @param {Date} start 
 * @param {Date} end 
 * @param {{ timestamp: Date, value: number }[][]} param2 
 */
function getString(start, end, [commands, messages, users, last_user]) {
    let str = "";

    start = start.getTime();
    if (end) end = end.getTime();

    const findIndex = entry => entry.timestamp > start;
    const findIndexEnd = entry => entry.timestamp > end;

    if (commands.length) commands = commands.slice(findFirstIndex(commands, findIndex));
    if (messages.length) messages = messages.slice(findFirstIndex(messages, findIndex));

    if (end) {
        if (commands.length) commands = commands.slice(0, findFirstIndex(commands, findIndexEnd));
        if (messages.length) messages = messages.slice(0, findFirstIndex(messages, findIndexEnd));
        if (users.length) users = users.slice(0, findFirstIndex(users, findIndexEnd));
    }

    str += `${messages.reduce((sum, entry) => sum + entry.value, 0)} Messages`;

    const commands_total = commands.reduce((sum, entry) => sum + entry.value, 0);
    if (commands_total) str += ` and ${commands_total} Commands`;
    
    if (users.length > 0) {
        let users_diff = users[users.length - 1].value;
        
        const beginIndex = findFirstIndex(users, findIndex);
        if (beginIndex === 0) users_diff -= last_user ? last_user.value : users[0].value;
        else if (beginIndex > 0) users_diff -= users[beginIndex - 1].value;

        if (users_diff > 0) str += ` and +${users_diff} Users`;
        if (users_diff < 0) str += ` and ${users_diff} Users`;
    }

    return str;
}

/**
 * 
 * @param {Date} start 
 * @param {Date} end 
 * @param {{ timestamp: Date, value: number }[][]} param2 
 */
function getAverageString(start, divider, [commands, messages, users, last_user]) {
    let str = "";

    start = start.getTime();

    const findIndex = entry => entry.timestamp > start;

    if (commands.length) commands = commands.slice(findFirstIndex(commands, findIndex));
    if (messages.length) messages = messages.slice(findFirstIndex(messages, findIndex));

    str += `${(messages.reduce((sum, entry) => sum + entry.value, 0) / divider).toFixed(2)} Messages`;

    const commands_total = commands.reduce((sum, entry) => sum + entry.value, 0) / divider;
    str += ` and ${commands_total.toFixed(2)} Commands`;

    if (users.length > 0) {
        let users_diff = users[users.length - 1].value;

        const beginIndex = findFirstIndex(users, findIndex);
        if (beginIndex === 0) users_diff -= last_user ? last_user.value : users[0].value;
        else if (beginIndex > 0) users_diff -= users[beginIndex - 1].value;

        if (users_diff >= 0) str += ` and +${(users_diff / divider).toFixed(2)} Users`;
        if (users_diff < 0) str += ` and ${(users_diff / divider).toFixed(2)} Users`;
    }

    return str;
}

module.exports = async function install(cr) {
    cr.register("stats", new class extends BaseCommand {
        async call(message) {
            const guildId = message.guild.id;

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

            const results = await Promise.all([
                guild_stats.get("commands").getRange(quartal, null, guildId).then(sort),
                guild_stats.get("messages").getRange(quartal, null, guildId).then(sort),
                guild_stats.get("users").getRange(quartal, null, guildId).then(sort),

                guild_stats.get("users").getLastItemBefore(quartal),
            ]);

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setAuthor(`${message.guild.name} - ${await message.channel.translate("Statistics")}`, message.guild.iconURL);

            embed.addField("Today", getString(today, null, results), true);
            embed.addField("Yesterday", getString(yesterday, today, results), true);

            embed.addField("Average (7 days)", getAverageString(week, 7, results));
            embed.addField("Average (30 days)", getAverageString(month, 30, results));
            if (results[3] && results[3].timestamp.getTime() < quartal.getTime()) embed.addField("Average (90 days)", getAverageString(quartal, 90, results));

            await message.channel.send({ embed });
            log(`Gave server stats for ${message.guild.id}`);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Get some stats about the alive-ness of this server"))
        .setCategory(Category.INFO);
    
    cr.register("serverinfo", new class extends BaseCommand {
        async call(message) {
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

            await message.channel.send({ embed });
            log(`Gave server info for ${message.guild.id}`);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Receive information about this server"))
        .setCategory(Category.INFO);
};