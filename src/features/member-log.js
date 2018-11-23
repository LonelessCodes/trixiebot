const log = require("../modules/log");
const stats = require("../logic/stats");
const { findDefaultChannel } = require("../modules/util");
const { format } = require("../logic/LocaleManager");
const Command = require("../class/Command");

class MemberLog extends Command {
    constructor() {
        super(...arguments);

        const updateGuildStatistics = () => {
            stats.get(stats.STATS.SERVER_COUNT).set(this.client.guilds.size);
            stats.get(stats.STATS.LARGE_SERVERS).set(this.client.guilds.filter(guild => !!guild.large).size);
            stats.get(stats.STATS.TOTAL_MEMBERS).set(this.client.guilds.array().map(g => g.members.size).reduce((pv, cv) => pv + cv, 0));
            stats.get(stats.STATS.TEXT_CHANNELS).set(this.client.channels.filter(guild => guild.type === "text").size);
        };

        updateGuildStatistics();

        this.client.addListener("guildCreate", guild => {
            setImmediate(async () => {
                const channel = findDefaultChannel(guild);
                if (!channel) return;

                await channel.sendTranslated("Hi! I'm new here. Let me introduce myself:\nI'm TrixieBot, a feature rich Discord bot for pony lovers (or losers, your choice) including Derpibooru, e621, Giphy, etc. integration as well as great admin features like timeouting users. I can be your fun little bot or mature server management system.\nJust call `!trixie` if you need help");
                log(`Trixie got invited and joined new guild ${guild.name}`);
                updateGuildStatistics();
            });
        });

        this.client.addListener("guildDelete", guild => {
            log(`Trixie got removed from guild ${guild.name}`);
            updateGuildStatistics();
        });

        this.client.addListener("guildMemberAdd", async member => {
            const guild = member.guild;

            if (!(await this.config.get(guild.id, "welcome.enabled"))) return;
            if (member.bot && !(await this.config.get(guild.id, "announce.bots"))) return;

            const channel = guild.channels.get(await this.config.get(guild.id, "announce.channel"));
            if (!channel) return;

            const str = format(await this.config.get(guild.id, "welcome.text") ||
                ("**" + await channel.translate("New member joined our Guild, guys!") + "**\n" +
                await channel.translate("Hey, {{user}} welcome to the server!")), {
                user: member.toString()
            });

            await channel.send(str);
            log(`New member ${member.user.username} joined guild ${guild.name}`);
            updateGuildStatistics();
        });

        this.client.addListener("guildMemberRemove", async member => {
            const guild = member.guild;

            if (!(await this.config.get(guild.id, "leave.enabled"))) return;
            if (member.bot && !(await this.config.get(guild.id, "announce.bots"))) return;

            const channel = guild.channels.get(await this.config.get(guild.id, "announce.channel"));
            if (!channel) return;

            const str = format(await this.config.get(guild.id, "leave.text") ||
                ("**" + await channel.translate("A soldier has left us") + "**\n" +
                await channel.translate("{{user}} left the server. Bye bye")), {
                user: `**${member.user.username}** #${member.user.discriminator}`
            });

            await channel.send(str);
            log(`Member ${member.user.username} left guild ${guild.name}`);
            updateGuildStatistics();
        });

        this.client.addListener("guildBanAdd", async (guild, user) => {
            if (!(await this.config.get(guild.id, "ban.enabled"))) return;
            if (user.bot && !(await this.config.get(guild.id, "announce.bots"))) return;

            const channel = guild.channels.get(await this.config.get(guild.id, "announce.channel"));
            if (!channel) return;

            const str = format(await this.config.get(guild.id, "ban.text") ||
                "{{user}} has been banned from the server. Don't let the door hit your ass on the way out!", {
                user: `**${user.username}** #${user.discriminator}`
            });

            await channel.send(str);
            log(`User ${user.username} has been banned from guild ${guild.name}`);
            updateGuildStatistics();
        });
    }
}

module.exports = MemberLog;
