const log = require("../../modules/log");
const fliptext = require("flip-text");
const Command = require("../../class/Command");

class FlipCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        
        if (message.content.toLowerCase() === "tableflip" || message.content.toLowerCase() === "tf") {
            await message.channel.send("(╯°□°）╯︵ ┻━┻");
            log("Flipped table successfully!!!");
            return;
        }

        if (message.content.toLowerCase() === "untableflip" || message.content.toLowerCase() === "uf") {
            await message.channel.send("┬─┬ ノ( ゜-゜ノ)");
            log("Unflipped table successfully!!!");
            return;
        }

        if (/^flip\b/i.test(message.content)) {
            const mention = message.mentions.members.first();
            if (!mention) {
                const text = message.content.replace(/\s+/g, " ");
                const tmp = text.substr(5);
                if (tmp === "") {
                    await message.channel.send(`Usage: \`${message.prefix}flip <user|string>\``);
                    log("Sent flip usage");
                    return;
                }
                await message.channel.send(`(╯°□°）╯︵ ${fliptext(tmp)}`);
                log(`Flipped ${tmp}`);
                return;
            }
            await message.channel.send(`(╯°□°）╯︵ ${fliptext(mention.displayName)}`);
            log(`Flipped ${mention.user.username}`);
            return;
        }

        if (/^unflip\b/i.test(message.content)) {
            const mention = message.mentions.members.first();
            if (!mention) {
                const text = message.content.replace(/\s+/g, " ");
                const tmp = text.substr(7);
                if (tmp === "") {
                    await message.channel.send(`Usage: \`${message.prefix}unflip <user|string>\``);
                    log("Sent unflip usage");
                    return;
                }
                await message.channel.send(`${tmp} ノ( ゜-゜ノ)`);
                log(`Unflipped ${tmp}`);
                return;
            }
            await message.channel.send(`${mention.displayName} ノ( ゜-゜ノ)`);
            log(`Unflipped ${mention.user.username}`);
            return;
        }
    }
    usage(prefix) {
        return `\`${prefix}flip <user|string>\`
\`user|string\` - user or text to flip

\`${prefix}unflip <user|string>\`
\`user|string\` - user or text to unflip

\`${prefix}tableflip\`
\`${prefix}untableflip\``;
    }
}

module.exports = FlipCommand;
