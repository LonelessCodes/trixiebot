const log = require("../modules/log");
const fliptext = require("flip-text");
const Command = require("../modules/Command");

const command = new Command(async function onmessage(message) {
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
            await message.channel.send("Usage: `!flip <user>`");
            log("Sent flip usage");
            return;
        }
        await message.channel.send(`(╯°□°）╯︵ ${fliptext(mention.displayName)}`);
        log(`Flipped ${mention.user.username}`);
        return;
    }

    if (/^!unflip\b/i.test(message.content)) {
        const mention = message.mentions.members.first();
        if (!mention) {
            await message.channel.send("Usage: `!unflip <user>`");
            log("Sent unflip usage");
            return;
        }
        await message.channel.send(`${mention.displayName} ノ( ゜-゜ノ)`);
        log(`Unflipped ${mention.user.username}`);
        return;
    }
}, {
    usage: `\`!flip <user>\`
\`user\` - user to flip

\`!unflip <user>\`
\`user\` - user to unflip

\`!tableflip\`
\`!untableflip\``,
    ignore: true
});

module.exports = command;
