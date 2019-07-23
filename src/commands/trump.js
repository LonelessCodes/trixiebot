const { userToString } = require("../util/util");
const fetch = require("node-fetch");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");
const MessageMentions = require("../util/commands/MessageMentions");

module.exports = function install(cr) {
    cr.registerCommand("trump", new SimpleCommand(async (message, content) => {
        if (message.channel.type === "text") {
            const mentions = new MessageMentions(content, message.guild);
            if (mentions.members.size > 0) {
                const member = mentions.members.first();

                /** @type {} */
                const request = await fetch("https://api.whatdoestrumpthink.com/api/v1/quotes/personalized?q=" + encodeURIComponent(userToString(member)));
                const magic = await request.json();
                if (!magic) {
                    throw new Error("API fucked up");
                }

                await message.channel.send(magic.message);

                return;
            }
        }

        /** @type {} */
        const request = await fetch("https://api.whatdoestrumpthink.com/api/v1/quotes/random");
        const magic = await request.json();
        if (!magic) {
            throw new Error("API fucked up");
        }

        await message.channel.send(magic.message);
    }))
        .setHelp(new HelpContent()
            .setDescription("What would Trump say?\nGets a random Trump quote")
            .setUsage("<?@mention>")
            .addParameterOptional("@mention", "If mentioned a user, command will return a personalized quote"))
        .setCategory(Category.MISC)
        .setScope(CommandScope.ALL);
};
