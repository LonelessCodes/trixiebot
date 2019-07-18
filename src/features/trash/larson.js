const TextCommand = require("../../class/TextCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");

module.exports = async function install(cr) {
    cr.registerCommand("larson", new TextCommand("https://cdn.discordapp.com/attachments/397369538196406275/399707043281502208/C2OMrf3UcAARAGc.png"))
        .setHelp(new HelpContent().setDescription("well\nyeah"))
        .setCategory(Category.IMAGE);
};