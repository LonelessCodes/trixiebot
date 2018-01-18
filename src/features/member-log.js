const log = require("../modules/log");

function init(client) {
    client.on("guildCreate", guild => {
        const defaultChannel = guild.channels.find(c => c.permissionsFor(guild.me).has("SEND_MESSAGES"));

        defaultChannel.send("Hi! I'm new here. Let me introduce myself: I'm TrixieBot, a feature rich Discord bot for pony lovers (or losers, your choice) including Derpibooru, e621, Giphy, etc. integration as well as great admin features like timeouting users. I can be your fun little bot or mature server management system.\nJust call `!trixie` if you need help");
        log(`Trixie got invited and joined new guild ${guild.name}`);
    });
    client.on("guildDelete", guild => {
        log(`Trixie got removed from guild ${guild.name}`);
    });
    client.on("guildMemberAdd", member => {
        const guild = member.guild;

        const defaultChannel = guild.channels.find(c => c.permissionsFor(guild.me).has("SEND_MESSAGES"));
        defaultChannel.send(`**New member joined our Guild, guys!**\nHey, ${member.user.toString()} welcome to the baloney server! How 'bout throwing a quick look into ${guild.channels.find("name", "welcome").toString()}?`);
        log(`New member ${member.user.username} joined guild ${guild.name}`);
    });
    client.on("guildMemberRemove", member => {
        const guild = member.guild;

        const defaultChannel = guild.channels.find(c => c.permissionsFor(guild.me).has("SEND_MESSAGES"));
        defaultChannel.send(`**A soldier has left us**\n*${member.displayName}* left the server. Bye bye`);
        log(`Member ${member.user.username} left guild ${guild.name}`);
    });
}

module.exports.init = init;
