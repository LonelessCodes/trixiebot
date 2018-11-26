const Discord = require("discord.js");
const packageFile = require("../../package.json");

const TextCommand = require("../class/TextCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr, client) {
    const FLAGS = Discord.Permissions.FLAGS;
    const invite_link = await client.generateInvite([
        FLAGS.MANAGE_ROLES,
        FLAGS.MANAGE_CHANNELS,
        FLAGS.VIEW_CHANNEL,
        FLAGS.MANAGE_MESSAGES,
        FLAGS.EMBED_LINKS,
        FLAGS.MENTION_EVERYONE,
        FLAGS.ADD_REACTIONS,
        FLAGS.BAN_MEMBERS,
        FLAGS.KICK_MEMBERS
    ]);

    cr.register("donate", new TextCommand("https://ko-fi.com/loneless ❤"))
        .setHelp(new HelpContent().setDescription("**TrixieBot costs $6 a month and a lot of time to maintain.**\nIf you like this bot, please consider giving the devs a little tip ❤"))
        .setCategory(Category.INFO);

    cr.register("version", new TextCommand(`v${packageFile.version}`))
        .setHelp(new HelpContent().setDescription("Returns the currently running version of TrixieBot"))
        .setCategory(Category.INFO);
    cr.registerAlias("version", "v");
    
    cr.register("invite", new TextCommand(invite_link))
        .setHelp(new HelpContent().setDescription("Gives a link to invite TrixieBot to your own server."))
        .setCategory(Category.INFO);
};