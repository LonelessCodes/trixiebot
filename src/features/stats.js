const log = require("../modules/log");
const stats = require("../logic/stats");
const CONST = require("../modules/CONST");
const Discord = require("discord.js");
const Command = require("../class/Command");

class StatCommand extends Command {
    constructor(client, config) {
        super(client, config);
    }

    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^stats\b/i.test(message.content)) return;

        const embed = new Discord.RichEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .addField("Server Count", stats.get(stats.NAME.SERVER_COUNT).get().toLocaleString("en"), true)
            .addField("Large Servers", stats.get(stats.NAME.LARGE_SERVERS).get().toLocaleString("en"), true)
            .addField("Total Members", stats.get(stats.NAME.TOTAL_MEMBERS).get().toLocaleString("en"), true)
            .addField("Text Channels", stats.get(stats.NAME.TEXT_CHANNELS).get().toLocaleString("en"), true)
            .addField("Active Web Users", stats.get(stats.NAME.ACTIVE_WEB_USERS).get().toLocaleString("en"), true)
            .addField("Total Web Users", stats.get(stats.NAME.TOTAL_WEB_USERS).get().toLocaleString("en"), true)
            .addField("Commands Executed", stats.get(stats.NAME.COMMANDS_EXECUTED).get().toLocaleString("en"), true);

        message.channel.send({ embed });
        log("Sent statistics of bot");
        return;
    }

    usage(prefix) {
        return `\`${prefix}stats\` to get some statistics from Trixie regarding herself`;
    }
}

module.exports = StatCommand;
