const fetch = require("node-fetch");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");
const RateLimiter = require("../util/commands/RateLimiter");
const TimeUnit = require("../modules/TimeUnit");

const baseURL = "https://api.funtranslations.com/translate/";

async function translate(type, text) {
    const url = `${baseURL}${type}.json?text=${encodeURIComponent(text)}`;
    const request = await fetch(url);
    const { success, contents } = await request.json();
    if (!success) {
        return "Request failed for some reason :c";
    }

    return contents.translated;
}

function translator(type, description) {
    return new OverloadCommand()
        .registerOverload("1+", new SimpleCommand((message, text) => translate(type, text)))
        .setHelp(new HelpContent()
            .setDescription(description)
            .setUsage("<text>")
            .addParameter("text", "The text to translate"))
        .setCategory(Category.TEXT)
        .setRateLimiter(new RateLimiter(TimeUnit.HOUR, 1, 2))
        .setScope(CommandScope.ALL);
}

module.exports = function install(cr) {
    cr.registerCommand("pirate", translator("pirate", "Translate something into pirate-ish"));
    cr.registerCommand("yoda", translator("yoda", "Translate something into yoda-ish"));
    cr.registerCommand("dolan", translator("dolan", "Translate something into dolan duck-ish"));
};
