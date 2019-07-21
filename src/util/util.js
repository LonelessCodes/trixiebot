const config = require("../config");
const CONST = require("../const");
const Discord = require("discord.js");

if (!config.has("owner_id")) throw new Error("No owner_id specified in the config");
const ownerId = config.get("owner_id");

module.exports = new class Utils {
    isPlainObject(input) {
        return input && !Array.isArray(input) && typeof input === "object";
    }

    findDefaultChannel(guild) {
        return guild.channels.find(c => new RegExp("general", "g").test(c.name) && c.type === "text") ||
            guild.channels
                .filter(c => c.type === "text" && c.send && {}.toString.call(c.send) === "[object Function]")
                .sort((a, b) => a.position - b.position)
                .find(c => c.permissionsFor(guild.me).has("SEND_MESSAGES"));
    }

    isOwner(member) {
        if (member instanceof Discord.GuildMember) member = member.user;
        return member.id === ownerId;
    }

    userToString(member, plainText = false) {
        if (member instanceof Discord.GuildMember) member = member.user;
        return plainText ?
            `${member.username}#${member.discriminator}` :
            `**${member.username}** #${member.discriminator}`;
    }

    basicEmbed(title, user, color = CONST.COLOR.PRIMARY) {
        if (user instanceof Discord.Guild) return new Discord.RichEmbed()
            .setColor(color)
            .setAuthor(user.name + " | " + title, user.iconURL);
        if (user instanceof Discord.GuildMember) user = user.user;
        return new Discord.RichEmbed()
            .setColor(color)
            .setAuthor(module.exports.userToString(user, true) + " | " + title, user.avatarURL);
    }
    
    progressBar(v, length, a, b) {
        if (Number.isNaN(v)) v = 0;
        if (!Number.isFinite(v)) v = 0;

        const str = new Array(length);
        str.fill(a);
        str.fill(b, Math.round(v * length));
        return `${str.join("")} ${(v * 100).toFixed(1)}%`;
    }
};
