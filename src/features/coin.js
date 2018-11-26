const log = require("../modules/log");
const { timeout } = require("../modules/utils");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

Array.prototype.random = function randomItem() {
    return this[Math.floor(Math.random() * this.length)];
};

const coin = ["heads", "tails"];

module.exports = async function install(cr) {
    cr.register("coin", new class extends BaseCommand {
        async call(message, content) {
            let bet = content.toLowerCase();
            if (bet === "") {
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
        }

        get help() {
            return new HelpContent()
                .setUsage(`\`{{prefix}}coin <bet>\`
\`bet\` - your bet. Either \`heads\` or \`tails\``);
        }
    }).setCategory(Category.MISC);
};