const log = require("../../modules/log");
const stats = require("../stats");
// eslint-disable-next-line no-unused-vars
const { Message, TextChannel, Permissions } = require("discord.js");

async function onProcessingError(message, err) {
    log(err);
    await message.channel.sendTranslated(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...\n\`${err.name}: ${err.message}\``);
}

class CommandListener {
    constructor(commandProcessor) {
        this.commandProcessor = commandProcessor;

        stats.bot.register("MESSAGES_TODAY", true);
        stats.bot.register("COMMANDS_EXECUTED", true);
    }

    /**
     * @param {Message} message 
     */
    async onMessage(message) {
        try {
            if (message.author.bot || message.author.equals(message.client.user)) return;

            stats.bot.get("MESSAGES_TODAY").inc(1);

            if (message.channel.type === "text") {
                const self = message.guild.me;
                /** @type {TextChannel} */
                const channel = message.channel;
                if (!channel.memberPermissions(self).has(Permissions.FLAGS.SEND_MESSAGES, true))
                    return;
            }

            const executed = await this.commandProcessor.run(message);
            if (executed) {
                stats.bot.get("COMMANDS_EXECUTED").inc(1);
            }
        } catch (err) {
            onProcessingError(message, err);
        }
    }
}

module.exports = CommandListener;