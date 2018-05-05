const log = require("../modules/log");
const { timeout } = require("../modules/util");
const Command = require("../class/Command");

Array.prototype.random = function randomItem() {
    return this[Math.floor(Math.random() * this.length)];
};

const coin = ["heads", "tails"];

class CoinCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^coin\b/i.test(message.content)) return;
        
        let bet = message.content.substr(5).toLowerCase();
        if (bet === "") {
            await message.channel.send(this.usage(message.prefix));
            log("Gracefully aborted attempt to flip coin: No bet given. Sent usage information");
            return;
        }

        if (bet === "head") bet = "heads";
        else if (bet === "tail") bet = "tails";

        if (!coin.includes(bet)) {
            await message.channel.send(`\`${bet}\` isn't a valid side of le coin. \`heads\` or \`tails\`?!`);
            log(`Bet "${bet}" isn't a valid side of a coin`);
            return;
        }

        const result = coin.random();

        await message.channel.send("The coin flips into the air...");
        await timeout(2000);
        await message.channel.send(result === bet ?
            `Whew! The coin landed on ${result}.` :
            `Sorry! The coin landed on ${result}.`);
        log(`Flipped coin. Bet ${bet}. Result ${result}`);
    }

    usage(prefix) {
        return `\`${prefix}coin <bet>\`
\`bet\` - your bet. Either \`heads\` or \`tails\``;
    }
}

module.exports = CoinCommand;