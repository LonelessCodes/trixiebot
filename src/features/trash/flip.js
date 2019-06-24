const fliptext = require("flip-text");

const SimpleCommand = require("../../class/SimpleCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");
const MessageMentions = require("../../modules/MessageMentions");

module.exports = async function install(cr) {
    cr.register("flip", new SimpleCommand(async (message, content) => {
        const mention = new MessageMentions(content, message.guild).members.first();
        if (!mention) {
            if (content === "") {
                return `Usage: \`${message.prefix}flip <user|string>\``;
            }
            return `(╯°□°）╯︵ ${fliptext(content)}`;
        }
        return `(╯°□°）╯︵ ${fliptext(mention.displayName)}`;
    }))
        .setHelp(new HelpContent().setDescription("Aw heck I'm gonna flip you upside down!\nFlips a text or username upside down like a good boi").setUsage("<user|string>").addParameter("user|string", "user or text to flip"))
        .setCategory(Category.ACTION);

    cr.register("unflip", new SimpleCommand(async (message, content) => {
        const mention = new MessageMentions(content, message.guild).members.first();
        if (!mention) {
            if (content === "") {
                return `Usage: \`${message.prefix}unflip <user|string>\``;
            }
            return `${content} ノ( ゜-゜ノ)`;
        }
        return `${mention.displayName || mention.username} ノ( ゜-゜ノ)`;
    }))
        .setHelp(new HelpContent().setDescription("Oh sorry didn't mean to. Lemme just...!\nUn-Flips a text or username like a real good boi who doesn't want you any trouble").setUsage("<user|string>").addParameter("user|string", "user or text to unflip"))
        .setCategory(Category.ACTION);
};