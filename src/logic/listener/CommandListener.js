const log = require("../../modules/log");
const INFO = require("../../info");
const stats = require("../stats");
const guild_stats = require("../managers/GuildStatsManager");
// eslint-disable-next-line no-unused-vars
const { Message, Permissions } = require("discord.js");

/**
 * @param {Message} message 
 */
async function onProcessingError(message, err) {
    log.error(err);
    
    try {
        if (INFO.DEV) await message.channel.sendTranslated(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...\n\`${err.name}: ${err.message}\``);
        else await message.channel.sendTranslated("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
    } catch (_) { _; }
}

class CommandListener {
    constructor(commandProcessor) {
        this.commandProcessor = commandProcessor;

        stats.bot.register("MESSAGES_TODAY", true);

        guild_stats.registerCounter("messages");
    }

    /**
     * @param {Message} message 
     */
    async onMessage(message) {
        try {
            if (message.author.bot || message.author.equals(message.client.user)) return;

            stats.bot.get("MESSAGES_TODAY").inc(1);
            if (message.channel.type === "text")
                guild_stats.get("messages").add(new Date, message.guild.id, message.channel.id, message.author.id);
 
            if (message.channel.type === "text" &&
                !message.channel.memberPermissions(message.guild.me).has(Permissions.FLAGS.SEND_MESSAGES, true))
                return;

            await this.commandProcessor.run(message);
        } catch (err) {
            onProcessingError(message, err);
        }
    }
}

module.exports = CommandListener;