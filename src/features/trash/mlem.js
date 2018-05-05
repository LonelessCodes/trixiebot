const log = require("../../modules/log");
const Command = require("../../class/Command");
const Discord = require("discord.js");

class MlemCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;

        if (/^mlem\b/i.test(message.content)) {
            const embed = new Discord.RichEmbed()
                .setColor(0x71B3E6)
                .setTitle("MLEM o3o")
                .setImage("https://d.equestriadev.de/i/_mlem.gif")
                .setFooter(await message.channel.translate("The chat got mlem'd by {{user}} | Art by n0nnny", {
                    user: message.member ? message.member.displayName : message.author.tag
                }));
            await message.channel.send({ embed });
            log("Requested mlem");
            return;
        }

        if (/^blep\b/i.test(message.content)) {
            const embed = new Discord.RichEmbed()
                .setColor(0x71B3E6)
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
