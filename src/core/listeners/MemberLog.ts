/*
 * Copyright (C) 2020 Christian Schäfer / Loneless
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

const log = require("../../log").default.namespace("member log");
import CONST from "../../const";
import INFO from "../../info";
import url from "url";
import { userToString, findDefaultChannel, doNothing } from "../../util/util";
import { immediate } from "../../util/promises";
import { registerHistogram } from "../managers/GuildStatsManager";

import Translation from "../../modules/i18n/Translation";
import TranslationFormatter from "../../modules/i18n/TranslationFormatter";

import Discord from "discord.js";
import LocaleManager from "../managers/LocaleManager";
import ConfigManager from "../managers/ConfigManager";
import BotStatsManager, { TOTAL_SERVERS, LARGE_SERVERS, TOTAL_USERS, TEXT_CHANNELS } from "../managers/BotStatsManager";

class MemberLog {
    user_count = registerHistogram("users");

    constructor(
        public client: Discord.Client,
        public config: ConfigManager,
        public locale: LocaleManager,
        public bot_stats: BotStatsManager
    ) {
        for (const [guildId, guild] of client.guilds.cache)
            this.user_count.set(new Date(), guildId, null, guild.memberCount).catch(doNothing);

        this.updateGuildStatistics();

        // attach listeners
        this.client.on("guildCreate", this.guildCreate.bind(this));
        this.client.on("guildDelete", this.guildDelete.bind(this));

        this.client.on("guildMemberAdd", this.guildMemberAdd.bind(this));
        this.client.on("guildMemberRemove", this.guildMemberRemove.bind(this));
        this.client.on("guildBanAdd", this.guildBanAdd.bind(this));
    }

    updateGuildStatistics(): void {
        this.bot_stats.set(TOTAL_SERVERS, this.client.guilds.cache.size);
        this.bot_stats.set(LARGE_SERVERS, this.client.guilds.cache.filter(guild => !!guild.large).size);
        this.bot_stats.set(TOTAL_USERS, this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.bot_stats.set(TEXT_CHANNELS, this.client.channels.cache.filter(guild => guild.type === "text").size);
    }

    async guildCreate(guild: Discord.Guild): Promise<void> {
        await immediate(); // guild isn't immediately available

        log.debug("added", `id:${guild.id} name:${JSON.stringify(guild.name)} channels:${guild.channels.cache.size} members:${guild.memberCount}`);

        this.user_count.set(new Date(), guild.id, null, guild.memberCount).catch(doNothing);

        const channel = findDefaultChannel(guild);
        if (!channel) return;

        let desc =
            "👋 **__Hey, I'm TrixieBot,__**\n\n" +
            "a creative community oriented bot for your server. I focus on providing powerful features instead of cluttering your chat.\n" +
            "I have many commands to engage with creative content, customize my behaviour, analyse server activity or just to help out.\n\n" +
            "For a list and usage of commands, use `!help`\n\n";

        if (INFO.WEBSITE) {
            const host = url.parse(INFO.WEBSITE).host;
            desc +=
                // TODO: make getting started page
                // `**📘  Getting Started**: [${host}/get-started](${INFO.WEBSITE}/get-started)\n` +
                `**🌐  Website**: [${host}](${INFO.WEBSITE})\n` +
                `**🔧  Web Dashboard**: [${host}/dashboard/${guild.id}](${INFO.WEBSITE}/dashboard/${guild.id})\n`;
        }

        await channel.send(
            new Discord.MessageEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .setThumbnail(this.client.user!.avatarURL({ size: 128, dynamic: true })!)
                .setDescription(desc)
                .setFooter(`TrixieBot v${INFO.VERSION}`)
        );
        this.updateGuildStatistics();
    }

    guildDelete(guild: Discord.Guild): void {
        log.debug("removed", `id:${guild.id}`);
        this.updateGuildStatistics();
    }

    async guildMemberAdd(member: Discord.GuildMember | Discord.PartialGuildMember): Promise<void> {
        if (member.partial) member = await member.fetch();

        const guild = member.guild;

        this.bot_stats.set(TOTAL_USERS, this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.user_count.set(new Date(), guild.id, null, guild.memberCount).catch(doNothing);

        const guild_config = await this.config.get(guild.id);

        if (!guild_config.welcome.enabled) return;
        if (member.user.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.cache.get(guild_config.announce.channel) as Discord.TextChannel | undefined;
        if (!channel) return;

        await this.locale.send(channel, new TranslationFormatter(
            guild_config.welcome.text ||
            await this.locale.translate(channel, new Translation("memberlog.join", "Welcome to the server, {{user}}!")),
            { user: member.toString() }
        ));
    }

    async guildMemberRemove(member: Discord.GuildMember | Discord.PartialGuildMember): Promise<void> {
        if (member.partial) member = await member.fetch();

        const guild = member.guild;

        this.bot_stats.set(TOTAL_USERS, this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.user_count.set(new Date(), guild.id, null, guild.memberCount).catch(doNothing);

        const guild_config = await this.config.get(guild.id);

        if (!guild_config.leave.enabled) return;
        if (member.user.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.cache.get(guild_config.announce.channel) as Discord.TextChannel | undefined;
        if (!channel) return;

        await this.locale.send(channel, new TranslationFormatter(
            guild_config.leave.text ||
            await this.locale.translate(channel, new Translation("memberlog.leave", "*{{user}}* has left the server. Bye bye")),
            { user: userToString(member) }
        ));
    }

    async guildBanAdd(guild: Discord.Guild, user: Discord.User | Discord.PartialUser): Promise<void> {
        if (user.partial) user = await user.fetch();

        this.bot_stats.set(TOTAL_USERS, this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0));
        this.user_count.set(new Date(), guild.id, null, guild.memberCount).catch(doNothing);

        const guild_config = await this.config.get(guild.id);

        if (!guild_config.ban.enabled) return;
        if (user.bot && !guild_config.announce.bots) return;

        const channel = guild.channels.cache.get(guild_config.announce.channel) as Discord.TextChannel | undefined;
        if (!channel) return;

        await this.locale.send(channel, new TranslationFormatter(
            guild_config.ban.text ||
            new Translation("memberlog.ban", "{{user}} has been banned from the server. Don't let the door hit your ass on the way out!"),
            { user: userToString(user) }
        ));
    }
}

export default MemberLog;
