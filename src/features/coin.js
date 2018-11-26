const log = require("../modules/log");
const { timeout } = require("../modules/utils");
const secureRandom = require("random-number-csprng");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

Array.prototype.random = async function randomItem() {
    return this[await secureRandom(0, this.length - 1)];
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

            const result = await coin.random();

            await message.channel.send("The coin flips into the air...");
            await timeout(2000);
            await message.channel.send(result === bet ?
                `Whew! The coin landed on ${result}.` :
                `Sorry! The coin landed on ${result}.`);
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<bet>")
            .addParameter("bet", "your bet. Either `heads` or `tails`"))
        .setCategory(Category.MISC);
};