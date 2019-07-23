const stats = require("../modules/stats");
const os = require("os");
const { toHumanTime } = require("../util/time");
const { timeout } = require("../util/promises");
const getChangelog = require("../modules/getChangelog");
const INFO = require("../info");
const CONST = require("../const");
const nanoTimer = require("../modules/nanoTimer");
const Discord = require("discord.js");

async function getCPUUsage() {
    var stats1 = getCPUInfo();
    var startIdle = stats1.idle;
    var startTotal = stats1.total;

    await timeout(1000);

    var stats2 = getCPUInfo();
    var endIdle = stats2.idle;
    var endTotal = stats2.total;

    var idle = endIdle - startIdle;
    var total = endTotal - startTotal;
    var perc = idle / total;

    return 1 - perc;
}

function getCPUInfo() {
    var cpus = os.cpus();

    var user = 0;
    var nice = 0;
    var sys = 0;
    var idle = 0;
    var irq = 0;

    for (const cpu of cpus) {
        user += cpu.times.user;
        nice += cpu.times.nice;
        sys += cpu.times.sys;
        irq += cpu.times.irq;
        idle += cpu.times.idle;
    }

    var total = user + nice + sys + idle + irq;

    return {
        idle: idle,
        total: total,
    };
}

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

module.exports = function install(cr, client) {
    cr.registerCommand("info", new SimpleCommand(async () => {
        const guilds = client.guilds;
        const users = guilds.reduce((prev, curr) => prev + curr.memberCount, 0);
        const channels = client.channels;

        const embed = new Discord.RichEmbed()
            .setColor(CONST.COLOR.PRIMARY)

            .addField("Commands", cr.commands.size.toLocaleString("en"))

            .addField("Bot Version", INFO.VERSION, true)
            .addField("Node.js Version", process.version.substr(1), true)
            .addField("Discord.js Version", Discord.version)

            .addField("CPU Usage", (await getCPUUsage() * 100).toFixed(0) + "%", true)
            .addField("CPU Cores", os.cpus().length.toString(), true)
            .addField("Memory Usage", ((os.totalmem() - os.freemem()) / (1024 * 1024)).toFixed(2) + " / " + (os.totalmem() / (1024 * 1024)).toFixed(2) + " MB")

            .addField("Uptime", "Server: " + toHumanTime(Math.floor(os.uptime() * 1000)) + ", Bot: " + toHumanTime(Math.floor(process.uptime() * 1000)))

            .addField("Total Servers", guilds.size.toLocaleString("en"), true)
            .addField("Text Channels", channels.filter(c => c.type === "text").size.toLocaleString("en"), true)
            .addField("Total Users", users.toLocaleString("en"))

            .addField("Executed Commands", stats.bot.get("COMMANDS_EXECUTED").get().toLocaleString("en"), true)
            .addField("Processed Messages", stats.bot.get("MESSAGES_TODAY").get().toLocaleString("en"))

            .addField("Active Web Users", stats.web.get(stats.web.NAME.ACTIVE_WEB_USERS).get().toLocaleString("en"), true)
            .addField("Total Web Users", stats.web.get(stats.web.NAME.TOTAL_WEB_USERS).get().toLocaleString("en"));

        return { embed };
    }))
        .setHelp(new HelpContent().setDescription("Gets the bot technical information. Nothing all that interesting."))
        .setCategory(Category.INFO)
        .setScope(CommandScope.ALL);

    cr.registerCommand("ping", new SimpleCommand(async (message, _, { timer }) => {
        const internal_ping = timer.end() / nanoTimer.NS_PER_MS;

        const pongText = await message.channel.translate("pong! Wee hee");
        const m = await message.channel.send(pongText);

        const ping = m.createdTimestamp - message.createdTimestamp;
        await m.edit(pongText + "\n" +
            "```" +
            `⏱ Real Latency:     ${ping}ms\n` +
            `⏱ Internal Latency: ${internal_ping.toFixed(1)}ms\n` +
            `💓 API Latency:      ${Math.round(client.ping)}ms\n` +
            "```");
    }))
        .setHelp(new HelpContent().setDescription("Ping-Pong-Ping-Pong-Ping-WEE HEEEEE."))
        .setCategory(Category.INFO)
        .setScope(CommandScope.ALL);
    cr.registerAlias("ping", "trixie ping");

    cr.registerCommand("changelog", new SimpleCommand(async message => {
        const logs = await getChangelog();

        const latest = logs[0];
        const embed = new Discord.RichEmbed()
            .setColor(CONST.COLOR.PRIMARY);

        embed.setTitle("v" + latest.version);

        const s = latest.body.split("\n");
        let title = null;
        let str = "";
        for (const line of s) {
            if (line.startsWith("###")) {
                if (title) embed.addField(title, str.trim().replace(/ \* /g, "\n* "));
                else embed.setDescription(str.trim().replace(/ \* /g, "\n* "));
                str = "";
                title = line.replace(/^###+\s+/, "");
            } else str += line;
        }
        if (title) embed.addField(title, str.trim().replace(/ \* /g, "\n* "));
        else embed.setDescription(str.trim().replace(/ \* /g, "\n* "));

        embed.addField("Full Changelog:", INFO.WEBSITE + "/changelog");

        embed.setFooter("TrixieBot - Released " + latest.date, client.user.avatarURL);

        await message.channel.send({ embed });
    }))
        .setHelp(new HelpContent().setDescription("Gets the changes made to TrixieBot in the latest versions"))
        .setCategory(Category.INFO)
        .setScope(CommandScope.ALL);
};
