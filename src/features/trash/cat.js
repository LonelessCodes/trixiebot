const fetch = require("node-fetch");
const catFace = require("cat-ascii-faces");

const SimpleCommand = require("../../class/SimpleCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");

async function randomCat(reconnectTries = 0) {
    let file;
    try {
        const response = await fetch("http://aws.random.cat/meow");
        const result = await response.json();
        file = result.file;
    } catch (err) {
        reconnectTries++;
        if (reconnectTries > 5) throw err;
        file = await randomCat(reconnectTries);
    }

    return file;
}

module.exports = async function install(cr) {
    cr.register("cat", new SimpleCommand(async message => {
        return await message.channel.translate("meow") + " " + catFace() + " " + await randomCat();
    }))
        .setHelp(new HelpContent().setUsage("`{{prefix}}cat` returns cat image :3"))
        .setCategory(Category.IMAGE);
    cr.registerAlias("cat", "kitty");
};