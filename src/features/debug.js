const log = require("../modules/log");
const stats = require("../logic/stats");
const os = require("os");
const { toHumanTime } = require("../modules/time_utils");
const { timeout } = require("../modules/utils");
const INFO = require("../info");
const CONST = require("../modules/CONST");
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
        "idle": idle,
        "total": total
    };
}



const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr, client) {
    cr.register("info", new class extends BaseCommand {
        async call(message) {
            const guilds = client.guilds;
            const users = client.users;
            const channels = client.channels;

            await message.channel.send("```prolog\n"
                + " --------- Technical Information --------- \n\n"
                + "Commands: " + cr.commands.size + "\n"
                + "Bot Version: " + INFO.VERSION + "\n"
                + "Node.js Version: " + process.version.substr(1) + "\n"
                + "Discord.js Version: " + Discord.version + "\n"
                + "CPU Usage: " + ((await getCPUUsage()) * 100).toFixed(1) + "%" + "\n"
                + "CPU Cores: " + os.cpus().length + "\n"
                + "Memory Usage: " + (os.freemem() / (1024 * 1024)).toFixed(2) + " / " + (os.totalmem() / (1024 * 1024)).toFixed(2) + " MB" + "\n"
                + "Server Uptime: " + toHumanTime(Math.floor(os.uptime() * 1000)) + "\n"
                + "Bot Uptime: " + toHumanTime(Math.floor(process.uptime() * 1000)) + "\n"
                + "\n --------- Trixie Information --------- \n\n"
                + "Guilds: " + guilds.size + "\n"
                + "Users: " + users.size + "\n"
                + "Channels: " + channels.size + "\n"
                + "Executed Commands: " + /* "Since Startup: " + client.getCommandTotalInt() + " / Total: " +*/ stats.bot.get(stats.bot.NAME.COMMANDS_EXECUTED).get() + "\n"
                + "```");
        }
    })
        .setHelp(new HelpContent().setDescription("Gets the bot technical information. Nothing all that interesting."))
        .setCategory(Category.INFO);

    cr.register("ping", new class extends BaseCommand {
        async call(message) {
            const pongText = await message.channel.translate("pong! Wee hee");
            const m = await message.channel.send(pongText);
            const ping = m.createdTimestamp - message.createdTimestamp;
            await m.edit(pongText + "\n" +
                `:stopwatch: \`Latency is     ${ping}ms\`\n` +
                `:heartbeat: \`API Latency is ${Math.round(client.ping)}ms\``);
            log(`Requested ping. Got ping of ${ping}ms`);
            return;
        }
    })
        .setHelp(new HelpContent().setDescription("Ping-Pong-Ping-Pong-Ping-WEE HEEEEE."))
        .setCategory(Category.INFO);
    cr.registerAlias("ping", "trixie ping");

    cr.register("stats", new class extends BaseCommand {
        async call(message) {
            const embed = new Discord.RichEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .addField("Total Servers", stats.bot.get(stats.bot.NAME.TOTAL_SERVERS).get().toLocaleString("en"), true)
                .addField("Large Servers", stats.bot.get(stats.bot.NAME.LARGE_SERVERS).get().toLocaleString("en"), true)
                .addField("Total Users", stats.bot.get(stats.bot.NAME.TOTAL_USERS).get().toLocaleString("en"), true)
                .addField("Text Channels", stats.bot.get(stats.bot.NAME.TEXT_CHANNELS).get().toLocaleString("en"), true)
                .addField("Active Web Users", stats.web.get(stats.web.NAME.ACTIVE_WEB_USERS).get().toLocaleString("en"), true)
                .addField("Total Web Users", stats.web.get(stats.web.NAME.TOTAL_WEB_USERS).get().toLocaleString("en"), true)
                .addField("Commands Executed", stats.bot.get(stats.bot.NAME.COMMANDS_EXECUTED).get().toLocaleString("en"), true);

            await message.channel.send({ embed });
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Get some statistics from Trixie regarding herself"))
        .setCategory(Category.INFO);
};