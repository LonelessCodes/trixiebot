const log = require("../modules/log");
const { timeout } = require("../modules/util");
const Command = require("../modules/Command");

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

const usage = `Usage: \`!coin <bet>\`
\`bet\` - your bet. Either \`heads\` or \`tails\``;

const coin = ["heads", "tails"];

const command = new Command(async function onmessage(message) {
    if (message.author.bot) return;
    if (message.channel.type !== "text") return;
    
    if (/^\!coin/i.test(message.content)) {
        let msg = message.content;
        while (/ \ /g.test(msg))
            msg = msg.replace(/ \ /g, " ");

        let bet = msg.substring(6).toLowerCase();
        if (bet === "") {
            message.channel.send(usage);
            return;
        }

        if (bet === "head") bet = "heads";
        else if (bet === "tail") bet = "tails";

        if (!coin.includes(bet)) {
            message.channel.send(`\`${bet}\` isn't a valid side of le coin. \`heads\` or \`tails\`?!\n\n`);
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
});

module.exports = command;
