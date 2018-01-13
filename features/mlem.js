const log = require("../modules/log");
const Command = require("../modules/Command");
const Discord = require("discord.js");

const command = new Command(async function onmessage(message) {
    if (/^\!mlem\b/i.test(message.content)) {
        const embed = new Discord.RichEmbed()
            .setColor(0x71B3E6)
            .setTitle("MLEM o3o")
            .setImage("https://d.equestriadev.de/i/_mlem.gif")
            .setFooter(`The chat got mlem'd by ${message.member.displayName} | Art by n0nnny`);
        await message.channel.send({ embed });
        log("Requested mlem");
        return;
    }
    
    if (/^\!blep\b/i.test(message.content)) {
        const embed = new Discord.RichEmbed()
            .setColor(0x71B3E6)
            .setTitle("BLEP o3o")
            .setImage("https://d.equestriadev.de/i/_blep.gif")
            .setFooter(`The chat got blep'd by ${message.member.displayName} | Art by n0nnny`);
        await message.channel.send({ embed });
        log("Requested blep");
        return;
    }
}, {
    usage: "`!mlem` mlem the chat :3\n`!blep` blep the chat :3",
    ignore: true
});

module.exports = command;
