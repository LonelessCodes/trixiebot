const fetch = require("node-fetch");
const querystring = require("querystring");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("trump", new class extends BaseCommand {
        async call(message) {
            if (message.mentions.members.size > 0) {
                const member = message.mentions.members.first();

                /** @type {} */
                const request = await fetch("https://api.whatdoestrumpthink.com/api/v1/quotes/personalized?q=" + querystring.escape(member.displayName));
                const magic = await request.json();
                if (!magic) {
                    throw new Error("API fucked up");
                }

                await message.channel.send(magic.message);

                return;
            }

            /** @type {} */
            const request = await fetch("https://api.whatdoestrumpthink.com/api/v1/quotes/random");
            const magic = await request.json();
            if (!magic) {
                throw new Error("API fucked up");
            }

            await message.channel.send(magic.message);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("What would Trump say?\nGets a random Trump quote")
            .setUsage("<?@mention>")
            .addParameterOptional("@mention", "If mentioned a user, command will return a personalized quote"))
        .setCategory(Category.MISC);
};