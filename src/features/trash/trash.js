const SimpleCommand = require("../../class/SimpleCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("cider", new SimpleCommand(async message => "**🍺 " + await message.channel.translate("A round of cider is distributed in the chat!") + "**"))
        .setHelp(new HelpContent().setDescription("Serve the chat some cider"))
        .setCategory(Category.MISC);
};