const log = require("../modules/log");
const { timeout } = require("../modules/util");
const Command = require("../class/Command");

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

const coin = ["heads", "tails"];

const command = new Command(async function onmessage(message) {
    if (/^\!coin\b/i.test(message.content)) {
        let bet = message.content.substr(6).toLowerCase();
        if (bet === "") {
            await message.channel.send(this.usage);
            log("Gracefully aborted attempt to flip coin: No bet given. Sent usage information");
            return;
        }

        if (bet === "head") bet = "heads";
        else if (bet === "tail") bet = "tails";

        if (!coin.includes(bet)) {
            await message.channel.send(`\`${bet}\` isn't a valid side of le coin. \`heads\` or \`tails\`?!\n\n`);
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
}, {
    usage: `\`!coin <bet>\`
\`bet\` - your bet. Either \`heads\` or \`tails\``,
    ignore: true
});

module.exports = command;
