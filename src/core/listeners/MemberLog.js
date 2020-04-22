/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { userToString, findDefaultChannel } = require("../../util/util");
const { immediate } = require("../../util/promises");
const log = require("../../log").default.namespace("member log");
const stats = require("../../modules/stats");
const guild_stats = require("../managers/GuildStatsManager");
const { format } = require("../../util/string");

const Translation = require("../../modules/i18n/Translation").default;

class MemberLog {
    constructor(client, config, locale) {
        this.client = client;
        this.config = config;
        this.locale = locale;

        this.TOTAL_SERVERS = stats.bot.register("TOTAL_SERVERS");
        this.LARGE_SERVERS = stats.bot.register("LARGE_SERVERS");
        this.TOTAL_USERS = stats.bot.register("TOTAL_USERS");
        this.TEXT_CHANNELS = stats.bot.register("TEXT_CHANNELS");

        this.user_count = guild_stats.registerHistogram("users");
        // this.online_user_count = await guild_stats.registerHistogram("online_users");

        for (const [guildId, guild] of client.guilds.cache)
            this.user_count.set(new Date, guildId, null, guild.memberCount);

        this.updateGuildStatistics();

        this.attachListeners();
    }

    attachListeners() {
        this.client.on("guildCreate", this.guildCreate.bind(this));
        this.client.on("guildDelete", this.guildDelete.bind(this));

        this.client.on("guildMemberAdd", this.guildMemberAdd.bind(this));
        this.client.on("guildMemberRemove", this.guildMemberRemove.bind(this));
        this.client.on("guildBanAdd", this.guildBanAdd.bind(this));
    }

    async updateGuildStatistics() {
        (await this.TOTAL_SERVERS).set(this.client.guilds.cache.size);
        (await this.LARGE_SERVERS).set(this.client.guilds.cache.filter(guild => !!guild.large).size);
        (await this.TOTAL_USERS).set(this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0));
        (await this.TEXT_CHANNELS).set(this.client.channels.cache.filter(guild => guild.type === "text").size);
    }

    async guildCreate(guild) {
        await immediate(); // guild isn't immediately available

        this.user_count.set(new Date, guild.id, null, guild.memberCount);

        const channel = findDefaultChannel(guild);
        if (!channel) return;

        await channel.send(
            "Hi! I'm new here. Let me introduce myself:\n" +
            "I'm TrixieBot, a bot which offers a variety of great features, " +
            "many of which to satisfy the needs of My Little Pony fans and server admins.\n" +
            "My set of commands range from utility stuff, simple fun, imageboard commands, " +
            "custom commands, soundboards, to even a full web dashboard and so much more!\n" +
            "Just call `!trixie` if you need my help"
        );
        log.debug("added", `id:${guild.id} name:${JSON.stringify(guild.name)} channels:${guild.channels.cache.size} members:${guild.memberCount}`);
        this.updateGuildStatistics();
    }

    guildDelete(guild) {
        log.debug("removed", `id:${guild.id}`);
        this.updateGuildStatistics();
    }

    async guildMemberAdd(member) {
        const guild = member.guild;

        stats.bot.get("TOTAL_USERS").set(this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.user_count.set(new Date, guild.id, null, guild.memberCount);

        const guild_config = await this.config.get(guild.id);

        if (!guild_config.welcome.enabled) return;
        if (member.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.cache.get(guild_config.announce.channel);
        if (!channel) return;

        const str = format(guild_config.welcome.text ||
            await this.locale.translate(channel, new Translation("memberlog.join", "Welcome to the server, {{user}}!")), {
            user: member.toString(),
        });

        await channel.send(str);
    }

    async guildMemberRemove(member) {
        const guild = member.guild;

        stats.bot.get("TOTAL_USERS").set(this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.user_count.set(new Date, guild.id, null, guild.memberCount);

        const guild_config = await this.config.get(guild.id);

        if (!guild_config.leave.enabled) return;
        if (member.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.cache.get(guild_config.announce.channel);
        if (!channel) return;

        const str = format(guild_config.leave.text ||
            await this.locale.translate(channel, new Translation("memberlog.leave", "*{{user}}* has left the server. Bye bye")), {
            user: userToString(member),
        });

        await channel.send(str);
    }

    async guildBanAdd(guild, user) {
        stats.bot.get("TOTAL_USERS").set(this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.user_count.set(new Date, guild.id, null, guild.memberCount);

        const guild_config = await this.config.get(guild.id);

        if (!guild_config.ban.enabled) return;
        if (user.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.cache.get(guild_config.announce.channel);
        if (!channel) return;

        const str = format(guild_config.ban.text ||
            await this.locale.translate(channel, new Translation("memberlog.ban", "{{user}} has been banned from the server. Don't let the door hit your ass on the way out!")), {
            user: userToString(user),
        });

        await channel.send(str);
    }
}

module.exports = MemberLog;
