function init(client) {
    client.on("guildMemberAdd", (member) => {
        const guild = member.guild;

        const defaultChannel = guild.channels.find(c => c.permissionsFor(guild.me).has("SEND_MESSAGES"));
        defaultChannel.send(`**New member joined our Guild, guys!**\nHey, ${member.user.toString()} welcome to the baloney server! How 'bout throwing a quick look into ${guild.channels.find("name", "welcome").toString()}?`);
    });
    client.on("guildMemberRemove", (member) => {
        const guild = member.guild;

        const defaultChannel = guild.channels.find(c => c.permissionsFor(guild.me).has("SEND_MESSAGES"));
        defaultChannel.send(`**A soldier has left us**\n*${member.displayName}* left the server. Bye bye`);
    });
}

module.exports.init = init;
