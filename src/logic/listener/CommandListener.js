const log = require("../../modules/log");
const { Message, TextChannel, Permissions } = require("discord.js");

async function onProcessingError(message, err) {
    log(err);
    await message.channel.sendTranslated(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...\n\`${err.name}: ${err.message}\``);
}

class CommandListener {
    constructor(commandProcessor) {
        this.commandProcessor = commandProcessor;
    }

    /**
     * @param {Message} message 
     */
    async onMessage(message) {
        try {
            if (message.author.bot || message.author.equals(message.client.user.id)) return;

            const self = message.guild.me;
            /** @type {TextChannel} */
            const channel = message.channel;
            if (!channel.memberPermissions(self).has(Permissions.FLAGS.SEND_MESSAGES, true))
                return;
        
            this.commandProcessor.run(message);
        } catch (err) {
            onProcessingError(message, err);
        }
    }
}

module.exports = CommandListener;