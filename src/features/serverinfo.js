const log = require("../modules/log");
const Command = require("../class/Command");
const Discord = require("discord.js");

class ServerInfoCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^serverinfo\b/i.test(message.content)) return;

        const embed = new Discord.RichEmbed;
        embed.setTitle(`${message.guild.name} ${await message.channel.translate("Statistics")}`);
        embed.setThumbnail(message.guild.iconURL);

        embed.addField("Owner", message.guild.owner.user.tag, true);
        embed.addField("ID", message.guild.id, true);
        embed.addField("User Count", message.guild.memberCount, true);
        embed.addField("Creation Time", message.guild.createdAt.toLocaleString("en-GB", { timeZone: "UTC" }), true);
        embed.addField("Channel Count", message.guild.channels.size, true);      
        embed.addField("Emoji Count", message.guild.emojis.size, true);      
        embed.addField("Region", message.guild.region, true);      

        await message.channel.send({ embed });
        log(`Gave server info for ${message.guild.id}`);
        return;
    }

    usage(prefix) {
        return `\`${prefix}serverinfo\` - receive information about this server`;
    }
}

module.exports = ServerInfoCommand;
