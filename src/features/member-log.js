const log = require("../modules/log");
const statistics = require("../logic/statistics");
const Command = require("../class/Command");

class MemberLog extends Command {
    constructor() {
        super(...arguments);

        const updateGuildStatistics = () => {
            statistics.get(statistics.STATS.SERVER_COUNT).set(this.client.guilds.size);
            statistics.get(statistics.STATS.LARGE_SERVERS).set(this.client.guilds.findAll("large", true).length);
            statistics.get(statistics.STATS.TOTAL_MEMBERS).set(this.client.guilds.array().map(g => g.members.size).reduce((pv, cv) => pv + cv, 0));
            statistics.get(statistics.STATS.TEXT_CHANNELS).set(this.client.channels.findAll("type", "text").length);
        };

        updateGuildStatistics();

        this.client.addListener("guildCreate", async guild => {
            const channel = guild.channels.find(c => c.type === "text" && c.permissionsFor(guild.me).has("SEND_MESSAGES"));

            channel.sendTranslated("Hi! I'm new here. Let me introduce myself: I'm TrixieBot, a feature rich Discord bot for pony lovers (or losers, your choice) including Derpibooru, e621, Giphy, etc. integration as well as great admin features like timeouting users. I can be your fun little bot or mature server management system.\nJust call `!trixie` if you need help");
            log(`Trixie got invited and joined new guild ${guild.name}`);
            updateGuildStatistics();
        });
        this.client.addListener("guildDelete", guild => {
            log(`Trixie got removed from guild ${guild.name}`);
            updateGuildStatistics();
        });
        this.client.addListener("guildMemberAdd", async member => {
            const guild = member.guild;

            const channel = guild.channels.find(c => c.type === "text" && c.permissionsFor(guild.me).has("SEND_MESSAGES"));
            channel.send(this.config.get(member.guild.id, "new_user_message") || 
                "**" + await channel.translate("New member joined our Guild, guys!") + "**\n" + 
                await channel.translate("Hey, {{user}} welcome to the baloney server! How 'bout throwing a quick look into {{rulesChannel}}?", {
                    user: member.user.toString(),
                    rulesChannel: guild.channels.find("name", "welcome").toString()
                }));
            log(`New member ${member.user.username} joined guild ${guild.name}`);
            updateGuildStatistics();
        });
        this.client.addListener("guildMemberRemove", async member => {
            const guild = member.guild;

            const channel = guild.channels.find(c => c.type === "text" && c.permissionsFor(guild.me).has("SEND_MESSAGES"));
            channel.send(this.config.get(member.guild.id, "user_left_message") || 
                "**" + await channel.translate("A soldier has left us") + "**\n" + 
                await channel.translate("*{{user}}* left the server. Bye bye", {
                    user: member.displayName
                }));
            log(`Member ${member.user.username} left guild ${guild.name}`);
            updateGuildStatistics();
        });
    }
}

module.exports = MemberLog;