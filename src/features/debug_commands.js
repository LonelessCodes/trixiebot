const log = require("../modules/log");
const stats = require("../logic/stats");
const CONST = require("../modules/CONST");
const Discord = require("discord.js");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr, client) {
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
    }).setCategory(Category.INFO);
    cr.registerAlias("ping", "trixie ping");

    cr.register("stats", new class extends BaseCommand {
        async call(message) {
            const embed = new Discord.RichEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .addField("Server Count", stats.get(stats.NAME.SERVER_COUNT).get().toLocaleString("en"), true)
                .addField("Large Servers", stats.get(stats.NAME.LARGE_SERVERS).get().toLocaleString("en"), true)
                .addField("Total Members", stats.get(stats.NAME.TOTAL_MEMBERS).get().toLocaleString("en"), true)
                .addField("Text Channels", stats.get(stats.NAME.TEXT_CHANNELS).get().toLocaleString("en"), true)
                .addField("Active Web Users", stats.get(stats.NAME.ACTIVE_WEB_USERS).get().toLocaleString("en"), true)
                .addField("Total Web Users", stats.get(stats.NAME.TOTAL_WEB_USERS).get().toLocaleString("en"), true)
                .addField("Commands Executed", stats.get(stats.NAME.COMMANDS_EXECUTED).get().toLocaleString("en"), true);

            await message.channel.send({ embed });
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Get some statistics from Trixie regarding herself"))
        .setCategory(Category.INFO);
};