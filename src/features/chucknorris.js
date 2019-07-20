const fetch = require("node-fetch");
const HTMLDecoderEncoder = require("html-encoder-decoder");

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");
const CommandScope = require("../logic/commands/CommandScope");

module.exports = async function install(cr) {
    cr.registerCommand("chucknorris", new SimpleCommand(async () => {
        /** @type {} */
        const request = await fetch("https://api.chucknorris.io/jokes/random");
        const magic = await request.json();
        if (!magic) {
            throw new Error("API fucked up");
        }

        return HTMLDecoderEncoder.decode(magic.value);
    }))
        .setHelp(new HelpContent()
            .setDescription("Chuck\nNorris\nFacts!!!"))
        .setCategory(Category.MISC)
        .setScope(CommandScope.ALL);
};