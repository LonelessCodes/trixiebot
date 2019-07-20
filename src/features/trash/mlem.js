const { userToString } = require("../../modules/util");
const CONST = require("../../const");
const Discord = require("discord.js");

const SimpleCommand = require("../../class/SimpleCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");
const CommandScope = require("../../logic/commands/CommandScope");

module.exports = async function install(cr) {
    cr.registerCommand("mlem", new SimpleCommand(async message =>
        new Discord.RichEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setTitle("MLEM o3o")
            .setImage("https://derpicdn.net/img/view/2017/11/7/1580177.gif")
            .setFooter(await message.channel.translate("The chat got mlem'd by {{user}} | Art by n0nnny", {
                user: userToString(message.author, true)
            }))
    ))
        .setHelp(new HelpContent().setDescription("Mlem the chat :3"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);

    cr.registerCommand("blep", new SimpleCommand(async message =>
        new Discord.RichEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setTitle("BLEP o3o")
            .setImage("https://derpicdn.net/img/view/2017/11/7/1580178.gif")
            .setFooter(await message.channel.translate("The chat got blep'd by {{user}} | Art by n0nnny", {
                user: userToString(message.author, true)
            }))
    ))
        .setHelp(new HelpContent().setDescription("Blep the chat :3"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);
};