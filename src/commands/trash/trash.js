const SimpleCommand = require("../../core/commands/SimpleCommand");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");
const CommandScope = require("../../util/commands/CommandScope");

module.exports = async function install(cr) {
    cr.registerCommand("cider", new SimpleCommand(async message => "**🍺 " + await message.channel.translate("A round of cider is distributed in the chat!") + "**"))
        .setHelp(new HelpContent().setDescription("Serve the chat some cider"))
        .setCategory(Category.MLP)
        .setScope(CommandScope.ALL);
};