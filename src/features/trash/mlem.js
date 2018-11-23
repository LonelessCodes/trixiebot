const log = require("../../modules/log");
const CONST = require("../../modules/CONST");
const BaseCommand = require("../../class/BaseCommand");
const Discord = require("discord.js");

class MlemCommand extends BaseCommand {
    async onmessage(message) {
        if (!message.prefixUsed) return;

        if (/^mlem\b/i.test(message.content)) {
            const embed = new Discord.RichEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .setTitle("MLEM o3o")
                .setImage("https://derpicdn.net/img/view/2017/11/7/1580177.gif")
                .setFooter(await message.channel.translate("The chat got mlem'd by {{user}} | Art by n0nnny", {
                    user: message.member ? message.member.displayName : message.author.tag
                }));
            await message.channel.send({ embed });
            log("Requested mlem");
            return;
        }

        if (/^blep\b/i.test(message.content)) {
            const embed = new Discord.RichEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .setTitle("BLEP o3o")
                .setImage("https://d.equestriadev.de/i/_blep.gif")
                .setFooter(await message.channel.translate("The chat got blep'd by {{user}} | Art by n0nnny", {
                    user: message.member ? message.member.displayName : message.author.tag
                }));
            await message.channel.send({ embed });
            log("Requested blep");
            return;
        }
    }
    usage(prefix) {
        return `
\`${prefix}mlem\` mlem the chat :3
\`${prefix}blep\` blep the chat :3`;
    }
}

module.exports = MlemCommand;
