const derpibooruKey = require("../../keys/derpibooru.json");
const fetch = require("node-fetch");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

async function get(params) {
    const scope = params.scope || "search";
    delete params.scope;

    let string = [];
    for (const key in params)
        string.push(key + "=" + params[key]);
    string = string.join("&");

    const result = await fetch(`https://derpibooru.org/${scope}.json?key=${derpibooruKey.key}&${string}`, {
        timeout: 10000
    });
    return await result.json();
}

const query = "pony, vulva, -penis, nudity, -foalcon, -photo, upvotes.gte:100".replace(/,\s+/g, ",").replace(/\s+/g, "+").toLowerCase();

async function process(message) {
    const image = await get({
        q: query,
        random_image: "true"
    }).then(({ id }) => get({
        scope: id
    }));

    const output = "https:" + image.representations.large + " *<https://derpibooru.org/" + image.id + ">*";

    await message.channel.send(output);
}

module.exports = async function install(cr) {
    cr.register("horsepussy", new class extends BaseCommand {
        async call(message, msg) {
            await process(message, msg, "random");
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Get some gud quality horse pussi OwO"))
        .setExplicit(true)
        .setCategory(Category.IMAGE);

    cr.registerAlias("horsepussy", "horsepussi");
    cr.registerAlias("horsepussy", "ponypussy");
    cr.registerAlias("horsepussy", "ponypussi");
    cr.registerAlias("horsepussy", "ponepussi");
};