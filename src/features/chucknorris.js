const fetch = require("node-fetch");
const HTMLDecoderEncoder = require("html-encoder-decoder");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("chucknorris", new class extends BaseCommand {
        async call(message) {
            /** @type {} */
            const request = await fetch("https://api.chucknorris.io/jokes/random");
            const magic = await request.json();
            if (!magic) {
                throw new Error("API fucked up");
            }

            await message.channel.send(HTMLDecoderEncoder.decode(magic.value));
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Chuck\nNorris\nFacts!!!"))
        .setCategory(Category.MISC);
};