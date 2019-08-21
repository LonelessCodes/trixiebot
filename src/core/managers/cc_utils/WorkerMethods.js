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

const log = require("../../log").namespace("cc methods");
const nanoTimer = require("../../../modules/NanoTimer");
const toEmoji = require("emoji-name-map");
const Discord = require("discord.js");
const { Member, Channel, Emoji, Role, Message } = require("./cc_classes");

class WorkerMethods {
    /**
     * @param {Discord.Client} client
     * @param {nanoTimer.NanoTimer} timer
     */
    constructor(client, timer) {
        this.client = client;
        this.timer = timer;

        /** @type {Map<string, Map<string, Discord.Message>>} */
        this.message_cache = new Map;
    }

    ready() {
        const time = this.timer.end() / nanoTimer.NS_PER_MS;
        log(`Worker ready. boot_time:${time.toFixed(1)}ms`);
    }

    // MESSAGE UTILS

    setMessage(message) {
        const guild = message.guild;
        if (!this.message_cache.has(guild.id)) this.message_cache.set(guild.id, new Map);
        this.message_cache.get(guild.id).set(message.id, message);
    }

    /**
     * @param {Discord.Guild} guild
     * @param {string} messageId
     */
    async getMessage(guild, messageId) {
        if (this.message_cache.has(guild.id) && this.message_cache.get(guild.id).has(messageId)) {
            return this.message_cache.get(guild.id).get(messageId);
        }

        /** @type {Discord.TextChannel[]} */
        let channels = guild.channels.filter(c => c.type == "text").array();
        for (let current of channels) {
            let target = await current.fetchMessage(messageId);
            if (target) {
                this.setMessage(target);
                return target;
            }
        }
    }

    // EMOJIS

    emoji__get({ emojiId, guildId }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);
        if (!guild.emojis.has(emojiId)) return;
        return new Emoji(guild.emojis.get(emojiId));
    }

    // REACTIONS

    async reaction__getMembers({ messageId, reactionId, guildId }) {
        if (!this.client.guilds.has(guildId)) return [];
        const guild = this.client.guilds.get(guildId);

        const m = await this.getMessage(guild, messageId);
        if (!m) return [];

        if (!m.reactions.has(reactionId)) return [];
        const members = m.reactions.get(reactionId).members.array();

        return members.map(m => new Member(m));
    }

    // MESSAGES

    async message__get({ messageId, guildId }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);

        const m = await this.getMessage(guild, messageId);
        if (!m) return;

        return new Message(m);
    }

    async message__delete({ messageId, guildId }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);

        const m = await this.getMessage(guild, messageId);
        if (!m) return;

        if (m.author.id !== this.client.user.id ||
            !m.channel.permissionsFor(guild.me).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
            return;

        await m.delete();
    }

    async message__edit({ messageId, guildId, embed, content }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);

        const m = await this.getMessage(guild, messageId);
        if (!m) return;

        if (m.author.id !== this.client.user.id) return;

        let message;
        if (embed && content) {
            message = await m.edit(content, { embed: new Discord.RichEmbed(embed) });
        } else if (embed) {
            message = await m.edit({ embed: new Discord.RichEmbed(embed) });
        } else if (content) {
            message = await m.edit(content);
        } else message = m;

        this.setMessage(message);

        return new Message(message);
    }

    async message__react({ messageId, guildId, emojis }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);

        const m = await this.getMessage(guild, messageId);
        if (!m) return;

        for (let emoji of emojis) {
            if (guild.emojis.has(emoji)) {
                await m.react(guild.emojis.get(emoji)).catch(() => { /* Do nothing */ });
            } else {
                const e = toEmoji.get(emoji);
                if (e) {
                    try {
                        await m.react(e);
                        return;
                    } catch (_) { /* Do nothing */ }
                }
                await m.react(emoji).catch(() => { /* Do nothing */ });
            }
        }
    }

    // ROLES

    role__get({ guildId, roleId }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);

        if (!guild.roles.has(roleId)) return;
        return new Role(guild.roles.get(roleId));
    }

    role__getMembers({ guildId, roleId }) {
        if (!this.client.guilds.has(guildId)) return [];
        const guild = this.client.guilds.get(guildId);

        if (!guild.roles.has(roleId)) return [];
        const role = guild.roles.get(roleId);
        const members = role.members.array();

        return members.map(m => new Member(m));
    }

    // MEMBERS

    async getMember(guild, memberId) {
        if (guild.members.has(memberId)) return guild.members.get(memberId);
        else return await guild.fetchMember(memberId).catch(() => { /* Do nothing */ });
    }

    async member__get({ guildId, memberId }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);

        const member = await this.getMember(guild, memberId);
        if (!member) return;

        return new Member(member);
    }

    async member__getRoles({ guildId, memberId }) {
        if (!this.client.guilds.has(guildId)) return [];
        const guild = this.client.guilds.get(guildId);

        const member = await this.getMember(guild, memberId);
        if (!member) return [];
        const roles = member.roles.array();

        return roles.map(m => new Role(m));
    }

    // CHANNELS

    channel__get({ guildId, channelId }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);

        if (!guild.channels.has(channelId)) return;
        const channel = guild.channels.get(channelId);

        return new Channel(channel);
    }

    async channel__createInvite({ guildId, channelId, options }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);

        if (!guild.channels.has(channelId)) return;
        const channel = guild.channels.get(channelId);

        if (!channel.permissionsFor(guild.me).has(Discord.Permissions.FLAGS.CREATE_INSTANT_INVITE))
            return;

        try {
            const invite = await channel.createInvite(options);
            if (!invite) return;

            return invite.url;
        } catch (_) { /* Do nothing */ }
    }

    async channel__send({ guildId, channelId, content, embed }) {
        if (!this.client.guilds.has(guildId)) return;
        const guild = this.client.guilds.get(guildId);

        if (!guild.channels.has(channelId)) return;
        const channel = guild.channels.get(channelId);

        let message;
        if (embed && content) {
            message = await channel.send(content, { embed: new Discord.RichEmbed(embed) });
        } else if (embed) {
            message = await channel.send({ embed: new Discord.RichEmbed(embed) });
        } else if (content) {
            message = await channel.send(content);
        }
        if (!message) return;

        this.setMessage(message);
        return new Message(message);
    }

    // GUILD

    async guild__getMembers({ guildId }) {
        if (!this.client.guilds.has(guildId)) return [];
        const guild = await this.client.guilds.get(guildId).fetchMembers();

        const members = guild.members.array();

        return members.map(m => new Member(m));
    }

    guild__getRoles({ guildId }) {
        if (!this.client.guilds.has(guildId)) return [];
        const guild = this.client.guilds.get(guildId);

        const roles = guild.roles.array();

        return roles.map(m => new Role(m));
    }

    guild__getChannels({ guildId }) {
        if (!this.client.guilds.has(guildId)) return [];
        const guild = this.client.guilds.get(guildId);

        const channels = guild.channels.array().filter(c => c.type === "text");

        return channels.map(m => new Channel(m));
    }

    guild__getEmojis({ guildId }) {
        if (!this.client.guilds.has(guildId)) return [];
        const guild = this.client.guilds.get(guildId);

        const emojis = guild.emojis.array();

        return emojis.map(m => new Emoji(m));
    }
}

module.exports = WorkerMethods;
