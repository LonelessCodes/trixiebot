const { userToString, findDefaultChannel } = require("../../util/util");
const { immediate } = require("../../util/promises");
const log = require("../../log").namespace("member log");
const stats = require("../../modules/stats");
const guild_stats = require("../managers/GuildStatsManager");
const { format } = require("../managers/LocaleManager");

class MemberLog {
    constructor(client, config) {
        this.client = client;
        this.config = config;

        this.TOTAL_SERVERS = stats.bot.register("TOTAL_SERVERS");
        this.LARGE_SERVERS = stats.bot.register("LARGE_SERVERS");
        this.TOTAL_USERS = stats.bot.register("TOTAL_USERS");
        this.TEXT_CHANNELS = stats.bot.register("TEXT_CHANNELS");

        this.user_count = guild_stats.registerHistogram("users");
        // this.online_user_count = await guild_stats.registerHistogram("online_users");

        for (const [guildId, guild] of client.guilds)
            this.user_count.set(new Date, guildId, null, guild.memberCount);
        
        this.updateGuildStatistics();

        this.attachListeners();
    }

    attachListeners() {
        this.client.on("guildCreate", this.guildCreate.bind(this));
        this.client.on("guildDelete", this.guildDelete.bind(this));
    }

    async updateGuildStatistics() {
        (await this.TOTAL_SERVERS).set(this.client.guilds.size);
        (await this.LARGE_SERVERS).set(this.client.guilds.filter(guild => !!guild.large).size);
        (await this.TOTAL_USERS).set(this.client.guilds.reduce((prev, curr) => prev + curr.memberCount, 0));
        (await this.TEXT_CHANNELS).set(this.client.channels.filter(guild => guild.type === "text").size);
    }

    async guildCreate(guild) {
        await immediate(); // guild isn't immediately available

        this.user_count.set(new Date, guild.id, null, guild.memberCount);

        const channel = findDefaultChannel(guild);
        if (!channel) return;

        // await channel.sendTranslated("Hi! I'm new here. Let me introduce myself:\nI'm TrixieBot, a feature rich Discord bot for pony lovers including Derpibooru, e621, Giphy, etc. integration as well as great admin features like timeouting users. I can be your fun little bot or mature server management system.\nJust call `!trixie` if you need help");
        await channel.sendTranslated("Hi! I'm new here. Let me introduce myself:\n" +
            "I'm TrixieBot, a bot which offers a variety of great features, many of which to satisfy the needs of My Little Pony fans and server admins. My set of commands range from random, simple fun, booru and GIF searching, imageboard commands, great moderation commands and so much more!\n" +
            "Just call `!trixie` if you need my help");
        log.debug("added", `id:${guild.id} name:${JSON.stringify(guild.name)} channels:${guild.channels.size} members:${guild.memberCount}`);
        this.updateGuildStatistics();
    }

    async guildDelete(guild) {
        log.debug("removed", `id:${guild.id}`);
        this.updateGuildStatistics();
    }

    async guildMemberAdd(member) {
        const guild = member.guild;

        stats.bot.get("TOTAL_USERS").set(this.client.guilds.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.user_count.set(new Date, guild.id, null, guild.memberCount);

        const guild_config = await this.config.get(guild.id);

        if (!guild_config.welcome.enabled) return;
        if (member.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.get(guild_config.announce.channel);
        if (!channel) return;

        const str = format(guild_config.welcome.text ||
            ("**" + await channel.translate("New member joined our Guild, guys!") + "**\n" +
                await channel.translate("Hey, {{user}} welcome to the server!")), {
            user: member.toString()
        });

        await channel.send(str);
    }

    async guildMemberRemove(member) {
        const guild = member.guild;

        stats.bot.get("TOTAL_USERS").set(this.client.guilds.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.user_count.set(new Date, guild.id, null, guild.memberCount);

        const guild_config = await this.config.get(guild.id);

        if (!guild_config.leave.enabled) return;
        if (member.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.get(guild_config.announce.channel);
        if (!channel) return;

        const str = format(guild_config.leave.text ||
            ("**" + await channel.translate("A soldier has left us") + "**\n" +
                await channel.translate("{{user}} left the server. Bye bye")), {
            user: userToString(member)
        });

        await channel.send(str);
    }

    async guildBanAdd(guild, user) {
        stats.bot.get("TOTAL_USERS").set(this.client.guilds.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.user_count.set(new Date, guild.id, null, guild.memberCount);

        const guild_config = await this.config.get(guild.id);

        if (!guild_config.ban.enabled) return;
        if (user.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.get(guild_config.announce.channel);
        if (!channel) return;

        const str = format(guild_config.ban.text ||
            "{{user}} has been banned from the server. Don't let the door hit your ass on the way out!", {
            user: userToString(user)
        });

        await channel.send(str);
    }
}

module.exports = MemberLog;