const fetch = require("node-fetch");
const dogFace = require("dog-ascii-faces");

const SimpleCommand = require("../../class/SimpleCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");

async function randomDog() {
    const response = await fetch("https://random.dog/woof.json");
    const result = await response.json();

    return result.url;
}

module.exports = async function install(cr) {
    cr.register("dog", new SimpleCommand(async message => {
        return await message.channel.translate("woof") + " " + dogFace() + " " + await randomDog();
    }))
        .setHelp(new HelpContent().setDescription("Random dog image :3"))
        .setCategory(Category.IMAGE);
    cr.registerAlias("dog", "doggo");
    cr.registerAlias("dog", "puppy");
};