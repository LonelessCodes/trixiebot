const CONST = require("../const");
const Discord = require("discord.js");

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");
const MessageMentions = require("../modules/MessageMentions");

const { userToString } = require("../modules/util");

module.exports = async function install(cr) {
    cr.registerCommand("whois", new SimpleCommand(async (message, content) => {
        const member = new MessageMentions(content, message.guild).members.first() || message.member;

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

        embed.setAuthor(userToString(member, true), member.user.avatarURL);
        embed.setThumbnail(member.user.avatarURL);

        if (member.user.bot) embed.addField("Is Bot", "✅");
        embed.addField("ID", member.user.id, true);
        if (member.nickname) embed.addField("Nickname", member.nickname, true);
        embed.addField("Status", member.user.presence.status, true);
        if (member.user.presence.game) embed.addField("Game", member.user.presence.game, true);
        embed.addField("Registered", member.user.createdAt.toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC", true);
        embed.addField("Joined", member.joinedAt.toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC", true);
        if (member.highestRole) embed.addField("Highest Role", member.highestRole, true);

        return { embed };
    }))
        .setHelp(new HelpContent()
            .setDescription("Receive information about a user or about yourself")
            .setUsage("<@user>")
            .addParameterOptional("@user", "If given, return info about that user, otherwise return info about yourself"))
        .setCategory(Category.INFO);
};