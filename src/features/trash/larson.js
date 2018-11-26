const TextCommand = require("../../class/TextCommand");
const Category = require("../../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("larson", new TextCommand("https://cdn.discordapp.com/attachments/397369538196406275/399707043281502208/C2OMrf3UcAARAGc.png"))
        .setCategory(Category.IMAGE);
};