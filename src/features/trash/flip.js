const fliptext = require("flip-text");

const SimpleCommand = require("../../class/SimpleCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");
const CommandScope = require("../../logic/commands/CommandScope");
const MessageMentions = require("../../modules/MessageMentions");

module.exports = async function install(cr) {
    cr.registerCommand("flip", new SimpleCommand(async (message, content) => {
        const is_dm = message.channel.type === "dm";
        const mention = !is_dm ? new MessageMentions(content, message.guild).members.first() : undefined;
        if (!mention) {
            if (content === "") {
                return `Usage: \`${message.prefix}flip <${!is_dm ? "user|" : ""}string>\``;
            }
            return `(╯°□°）╯︵ ${fliptext(content)}`;
        }
        return `(╯°□°）╯︵ ${fliptext(mention.displayName)}`;
    }))
        .setHelp(new HelpContent().setDescription("Aw heck I'm gonna flip you upside down!\nFlips a text or username upside down like a good boi").setUsage("<user|string>").addParameter("user|string", "user or text to flip"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);

    cr.registerCommand("unflip", new SimpleCommand(async (message, content) => {
        const is_dm = message.channel.type === "dm";
        const mention = !is_dm ? new MessageMentions(content, message.guild).members.first() : undefined;
        if (!mention) {
            if (content === "") {
                return `Usage: \`${message.prefix}unflip <${!is_dm ? "user|" : ""}string>\``;
            }
            return `${content} ノ( ゜-゜ノ)`;
        }
        return `${mention.displayName || mention.username} ノ( ゜-゜ノ)`;
    }))
        .setHelp(new HelpContent().setDescription("Oh sorry didn't mean to. Lemme just...!\nUn-Flips a text or username like a real good boi who doesn't want you any trouble").setUsage("<user|string>").addParameter("user|string", "user or text to unflip"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);
};