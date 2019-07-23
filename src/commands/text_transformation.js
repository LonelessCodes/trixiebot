const tinytext = require("tiny-text");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const MessageMentions = require("../util/commands/MessageMentions");
const CommandScope = require("../util/commands/CommandScope");

module.exports = function install(cr) {
    cr.registerCommand("smol", new SimpleCommand(async (message, content) => {
        const is_guild = message.channel.type === "text";
        const mention = is_guild ? new MessageMentions(content, message.guild).members.first() : undefined;
        if (!mention) {
            const text = content.replace(/[^\S\x0a\x0d]+/g, " ");
            if (text === "") {
                await message.channel.send(`Usage: \`${message.prefix}smol <string${is_guild ? "|user" : ""}>\``);
                return;
            }
            await message.channel.send(tinytext(text));
            return;
        }
        await message.channel.send(tinytext(mention.displayName));
    }))
        .setHelp(new HelpContent()
            .setDescription("Make teeeeny tiny text")
            .setUsage("<string|user>")
            .addParameter("string|user", "text or user to smollerize uwu"))
        .setCategory(Category.TEXT)
        .setScope(CommandScope.ALL);
    cr.registerAlias("smol", "small");
};
