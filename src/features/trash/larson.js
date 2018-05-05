const log = require("../../modules/log");
const Command = require("../../class/Command");

class LarsonCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^larson\b/i.test(message.content)) return;

        await message.channel.send("https://cdn.discordapp.com/attachments/397369538196406275/399707043281502208/C2OMrf3UcAARAGc.png");
        log("Requested larson");
    }
    usage(prefix) {
        return `\`${prefix}larson\` larson.`;
    }
}

module.exports = LarsonCommand;