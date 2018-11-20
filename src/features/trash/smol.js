const log = require("../../modules/log");
const tinytext = require("tiny-text");
const Command = require("../../class/Command");

class SmolCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^smol\b/i.test(message.content)) return;

        const mention = message.channel.type === "text" ?
            message.mentions.members.first() :
            message.mentions.users.first();
        if (!mention) {
            const text = message.content.replace(/[^\S\x0a\x0d]+/g, " ");
            const tmp = text.substr(5);
            if (tmp === "") {
                await message.channel.send(`Usage: \`${message.prefix}smol <string|user>\``);
                log("Sent smol usage");
                return;
            }
            await message.channel.send(tinytext(tmp));
            log(`Smoled ${tmp}`);
            return;
        }
        await message.channel.send(tinytext(mention.displayName || mention.username));
        log(`Smoled ${(mention.user || mention).username}`);
        return;
    }
    usage(prefix) {
        return `\`${prefix}smol <string|user>\`
\`string|user\` - text or user to smollerize uwu`;
    }
}

module.exports = SmolCommand;
