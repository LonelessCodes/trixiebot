const { timeout } = require("../modules/util");
const { randomItem } = require("../modules/util/array");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

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
                return;
            }

            const result = await randomItem(coin);

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