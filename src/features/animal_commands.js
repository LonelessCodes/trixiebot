const fetch = require("node-fetch");
const catFace = require("cat-ascii-faces");
const dogFace = require("dog-ascii-faces");

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

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

async function randomDog() {
    const response = await fetch("https://random.dog/woof.json");
    const result = await response.json();

    return result.url;
}

async function randomFox() {
    const response = await fetch("https://randomfox.ca/floof");
    const result = await response.json();

    return result.image;
}

async function randomShibe() {
    const response = await fetch("http://shibe.online/api/shibes?count=1&urls=true&httpsUrls=true");
    const result = await response.json();

    return result[0];
}

async function randomBird() {
    const response = await fetch("http://shibe.online/api/birds?count=1&urls=true&httpsUrls=true");
    const result = await response.json();

    return result[0];
}

module.exports = async function install(cr) {
    cr.registerCommand("cat", new SimpleCommand(async message => {
        return await message.channel.translate("meow") + " " + catFace() + " " + await randomCat();
    }))
        .setHelp(new HelpContent().setDescription("Random cat image :3"))
        .setCategory(Category.IMAGE);
    cr.registerAlias("cat", "kitty");

    cr.registerCommand("dog", new SimpleCommand(async message => {
        return await message.channel.translate("woof") + " " + dogFace() + " " + await randomDog();
    }))
        .setHelp(new HelpContent().setDescription("Random dog image :3"))
        .setCategory(Category.IMAGE);
    cr.registerAlias("dog", "doggo");
    cr.registerAlias("dog", "puppy");
    cr.registerAlias("dog", "bork");
    cr.registerAlias("dog", "pup");

    cr.registerCommand("fox", new SimpleCommand(async message => {
        return await message.channel.translate("yip") + " " + "🦊" + " " + await randomFox();
    }))
        .setHelp(new HelpContent().setDescription("Random fox image :3"))
        .setCategory(Category.IMAGE);
    cr.registerAlias("fox", "foxie");
    cr.registerAlias("fox", "foxi");
    cr.registerAlias("fox", "weff");

    cr.registerCommand("shibe", new SimpleCommand(async message => {
        return await message.channel.translate("weff") + " " + dogFace() + " " + await randomShibe();
    }))
        .setHelp(new HelpContent().setDescription("Random SHIBE image :3"))
        .setCategory(Category.IMAGE);

    cr.registerCommand("bird", new SimpleCommand(async message => {
        return await message.channel.translate("peep") + " " + "ovo" + " " + await randomBird();
    }))
        .setHelp(new HelpContent().setDescription("Random Birb image ovo"))
        .setCategory(Category.IMAGE);
    cr.registerAlias("bird", "birb");
    cr.registerAlias("bird", "borb");
    cr.registerAlias("bird", "birbo");
};