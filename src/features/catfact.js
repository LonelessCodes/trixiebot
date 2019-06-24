const fetch = require("node-fetch");

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("catfact", new SimpleCommand(async () => {
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
        .setCategory(Category.MISC);
};