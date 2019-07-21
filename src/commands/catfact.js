const fetch = require("node-fetch");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

module.exports = async function install(cr) {
    cr.registerCommand("catfact", new SimpleCommand(async () => {
        /** @type {} */
        const request = await fetch("https://cat-fact.herokuapp.com/facts/random");
        const magic = await request.json();
        if (!magic) {
            throw new Error("API fucked up");
        }

        return magic.text;
    }))
        .setHelp(new HelpContent()
            .setDescription("Get you a cat fact that will help you raise your babies better <3"))
        .setCategory(Category.MISC)
        .setScope(CommandScope.ALL);
};