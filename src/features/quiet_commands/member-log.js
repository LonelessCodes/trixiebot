const { userToString } = require("../../modules/util");
const log = require("../../modules/log");
const stats = require("../../logic/stats");
const guild_stats = require("../../logic/managers/GuildStatsManager");
const { findDefaultChannel } = require("../../modules/util");
const { format } = require("../../logic/managers/LocaleManager");

module.exports = async function install(cr, client, config) {
    await stats.bot.register("TOTAL_SERVERS");
    await stats.bot.register("LARGE_SERVERS");
    await stats.bot.register("TOTAL_USERS");
    await stats.bot.register("TEXT_CHANNELS");

    await guild_stats.register("users", "value");

    for (const [guildId, guild] of client.guilds) {
        guild_stats.get("users").set(new Date, guildId, null, guild.members.size);
    }

    const updateGuildStatistics = () => {
        stats.bot.get("TOTAL_SERVERS").set(client.guilds.size);
        stats.bot.get("LARGE_SERVERS").set(client.guilds.filter(guild => !!guild.large).size);
        stats.bot.get("TOTAL_USERS").set(client.users.size);
        stats.bot.get("TEXT_CHANNELS").set(client.channels.filter(guild => guild.type === "text").size);
    };

    updateGuildStatistics();

    client.addListener("guildCreate", guild => {
        setImmediate(async () => {
            const channel = findDefaultChannel(guild);
            if (!channel) return;

            // await channel.sendTranslated("Hi! I'm new here. Let me introduce myself:\nI'm TrixieBot, a feature rich Discord bot for pony lovers including Derpibooru, e621, Giphy, etc. integration as well as great admin features like timeouting users. I can be your fun little bot or mature server management system.\nJust call `!trixie` if you need help");
            await channel.sendTranslated("Hi! I'm new here. Let me introduce myself:\n" +
                "I'm TrixieBot, a bot which offers a variety of great features, many of which to satisfy the needs of My Little Pony fans and server admins. My set of commands range from random, simple fun, booru and GIF searching, imageboard commands, great moderation commands and so much more!\n" +
                "Just call `!trixie` if you need my help");
            log.debug("Member Log", `Trixie got invited and joined new guild ${guild.name}`);
            updateGuildStatistics();

            guild_stats.get("users").set(new Date, guild.id, null, guild.members.size);
        });
    });

    client.addListener("guildDelete", guild => {
        log.debug("Member Log", `Trixie got removed from guild ${guild.name}`);
        updateGuildStatistics();
    });

    client.addListener("guildMemberAdd", async member => {
        const guild = member.guild;

        const guild_config = await config.get(guild.id);

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
        updateGuildStatistics();

        guild_stats.get("users").set(new Date, guild.id, null, guild.members.size);
    });

    client.addListener("guildMemberRemove", async member => {
        const guild = member.guild;

        const guild_config = await config.get(guild.id);

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
        updateGuildStatistics();

        guild_stats.get("users").set(new Date, guild.id, null, guild.members.size);
    });

    client.addListener("guildBanAdd", async (guild, user) => {
        const guild_config = await config.get(guild.id);

        if (!guild_config.ban.enabled) return;
        if (user.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.get(guild_config.announce.channel);
        if (!channel) return;

        const str = format(guild_config.ban.text ||
            "{{user}} has been banned from the server. Don't let the door hit your ass on the way out!", {
            user: userToString(user)
        });

        await channel.send(str);
        updateGuildStatistics();

        guild_stats.get("users").set(new Date, guild.id, null, guild.members.size);
    });
};