const tinytext = require("tiny-text");

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");
const MessageMentions = require("../modules/MessageMentions");
const CommandScope = require("../logic/commands/CommandScope");

module.exports = async function install(cr) {
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