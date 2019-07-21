const { timeout } = require("../util/promises");
const { randomItem } = require("../util/array");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const coin = ["heads", "tails"];

module.exports = async function install(cr) {
    cr.registerCommand("coin", new SimpleCommand(async (message, content) => {
        let bet = content.toLowerCase();
        if (bet === "") {
            bet = await randomItem(coin);
            await message.channel.send(`Your bet: ${bet}`);
        }

        if (bet === "head") bet = "heads";
        else if (bet === "tail") bet = "tails";

        if (!coin.includes(bet)) {
            await message.channel.send(`\`${bet}\` isn't a valid side of le coin. \`heads\` or \`tails\`?!`);
            return;
        }

        const result = await randomItem(coin);

        await message.channel.send("The coin flips into the air...");
        await timeout(2000);
        await message.channel.send(result === bet ?
            `Whew! The coin landed on ${result}.` :
            `Sorry! The coin landed on ${result}.`);
    }))
        .setHelp(new HelpContent()
            .setUsage("<bet>")
            .addParameter("bet", "your bet. Either `heads` or `tails`"))
        .setCategory(Category.MISC)
        .setScope(CommandScope.ALL);
};