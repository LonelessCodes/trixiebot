const fetch = require("node-fetch");
const querystring = require("querystring");

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

const baseURL = "https://api.funtranslations.com/translate/";

async function translate(type, text) {
    const url = `${baseURL}${type}.json?text=${querystring.escape(text)}`;
    const request = await fetch(url);
    const { success, contents } = await request.json();
    if (!success) {
        return "Request failed for some reason :c";
    }

    return contents.translated;
}

function translator(type, description) {
    return new SimpleCommand(async (message, text) => {
        if (text === "") return;
        return await translate(type, text);
    })
        .setHelp(new HelpContent()
            .setDescription(description)
            .setUsage("<text>")
            .addParameter("text", "The text to translate"))
        .setCategory(Category.TEXT);
}

module.exports = async function install(cr) {
    cr.register("pirate", translator("pirate", "Translate something into pirate-ish"));
    cr.register("yoda", translator("yoda", "Translate something into yoda-ish"));
    cr.register("dolan", translator("dolan", "Translate something into dolan duck-ish"));
};