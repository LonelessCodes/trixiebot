const CONST = require("../../modules/CONST");
const Discord = require("discord.js");
const Command = require("../../class/Command");

class ClearCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^clear\b/i.test(message.content)) return;

        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
        if (!permission) return;

        
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return;
    }
}

module.exports = ClearCommand;
