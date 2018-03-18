const log = require("../../modules/log");
const fliptext = require("flip-text");
const Command = require("../../class/Command");

class FlipCommand extends Command {
    async onmessage(message) {
        if (message.content.toLowerCase() === "!tableflip" || message.content.toLowerCase() === "!tf") {
            await message.channel.send("(╯°□°）╯︵ ┻━┻");
            log("Flipped table successfully!!!");
            return;
        }

        if (message.content.toLowerCase() === "!untableflip" || message.content.toLowerCase() === "!uf") {
            await message.channel.send("┬─┬ ノ( ゜-゜ノ)");
            log("Unflipped table successfully!!!");
            return;
        }

        if (/^!flip\b/i.test(message.content)) {
            const mention = message.mentions.members.first();
            if (!mention) {
                const text = message.content.replace(/\s+/g, " ");
                const tmp = text.substr(6);
                if (tmp === "") {
                    await message.channel.send("Usage: `!flip <user|string>`");
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

        if (/^!unflip\b/i.test(message.content)) {
            const mention = message.mentions.members.first();
            if (!mention) {
                const text = message.content.replace(/\s+/g, " ");
                const tmp = text.substr(8);
                if (tmp === "") {
                    await message.channel.send("Usage: `!unflip <user|string>`");
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
    get usage() {
        return `\`!flip <user|string>\`
\`user|string\` - user or text to flip

\`!unflip <user|string>\`
\`user|string\` - user or text to unflip

\`!tableflip\`
\`!untableflip\``;
    }
}

module.exports = FlipCommand;
