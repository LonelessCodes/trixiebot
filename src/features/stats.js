const log = require("../modules/log");
const statistics = require("../logic/statistics");
const CONST = require("../modules/const");
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
            .addField("Server Count", statistics.get(statistics.STATS.SERVER_COUNT).get().toLocaleString("en"), true)
            .addField("Large Servers", statistics.get(statistics.STATS.LARGE_SERVERS).get().toLocaleString("en"), true)
            .addField("Total Members", statistics.get(statistics.STATS.TOTAL_MEMBERS).get().toLocaleString("en"), true)
            .addField("Text Channels", statistics.get(statistics.STATS.TEXT_CHANNELS).get().toLocaleString("en"), true)
            .addField("Active Web Users", statistics.get(statistics.STATS.ACTIVE_WEB_USERS).get().toLocaleString("en"), true)
            .addField("Total Web Users", statistics.get(statistics.STATS.TOTAL_WEB_USERS).get().toLocaleString("en"), true)
            .addField("Commands Executed", statistics.get(statistics.STATS.COMMANDS_EXECUTED).get().toLocaleString("en"), true);

        message.channel.send({ embed });
        log("Sent statistics of bot");
        return;
    }

    usage(prefix) {
        return `\`${prefix}stats\` to get some statistics from Trixie regarding herself`;
    }
}

module.exports = StatCommand;
