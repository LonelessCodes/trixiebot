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

const Discord = require("discord.js");
const toEmoji = require("emoji-name-map");
const { Member, Channel, Emoji, Role, Message } = require("./cc_classes");

class WorkerMethods {
    constructor(client, database, settings_db, cpc) {
        this.client = client;

        this.database = database;

        this.settings_db = settings_db;

        /** @type {Map<string, Map<string, Discord.Message>>} */
        this.message_cache = new Map;

        this.cpc = cpc;

        // METHODS

        this.cpc.answer("getEmoji", ({ emojiId, guildId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);
            if (!guild.emojis.has(emojiId)) return;
            return new Emoji(guild.emojis.get(emojiId));
        });

        this.cpc.answer("emoji.addRole", async ({ emojiId, guildId, roles }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);
            if (!guild.emojis.has(emojiId)) return;
            let emoji = guild.emojis.get(emojiId);

            roles = roles.filter(role => guild.roles.has(role)).map(role => guild.roles.get(role));
            emoji = await emoji.addRestrictedRoles(roles);

            return new Emoji(emoji);
        });

        this.cpc.answer("emoji.removeRole", async ({ emojiId, guildId, roles }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);
            if (!guild.emojis.has(emojiId)) return;
            let emoji = guild.emojis.get(emojiId);

            roles = roles.filter(role => guild.roles.has(role)).map(role => guild.roles.get(role));
            emoji = await emoji.removeRestrictedRole(roles);

            return new Emoji(emoji);
        });

        this.cpc.answer("reaction.getMembers", async ({ messageId, reactionId, guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            const m = await this.getMessage(guild, messageId);
            if (!m) return [];

            if (!m.reactions.has(reactionId)) return [];
            const members = m.reactions.get(reactionId).members.array();

            return members.map(m => new Member(m));
        });

        this.cpc.answer("getMessage", async ({ messageId, guildId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            const m = await this.getMessage(guild, messageId);
            if (!m) return;

            return new Message(m);
        });

        this.cpc.answer("message.delete", async ({ messageId, guildId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            const m = await this.getMessage(guild, messageId);
            if (!m) return;

            if (m.author.id === this.client.user.id || m.channel.permissionsFor(guild.me).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
                await m.delete();
        });

        this.cpc.answer("message.edit", async ({ messageId, guildId, embed, content }) => {
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
        });

        this.cpc.answer("message.react", async ({ messageId, guildId, emojis }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            const m = await this.getMessage(guild, messageId);
            if (!m) return;

            for (let emoji of emojis) {
                if (guild.emojis.has(emoji)) {
                    await m.react(guild.emojis.get(emoji)).catch(() => { /* Do nothing */ });
                } else {
                    const e = toEmoji.get(emoji);
                    if (e) await m.react(e).catch(() => { /* Do nothing */ });
                    else await m.react(emoji).catch(() => { /* Do nothing */ });
                }
            }
        });

        this.cpc.answer("getRole", ({ guildId, roleId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            if (!guild.roles.has(roleId)) return;
            return new Role(guild.roles.get(roleId));
        });

        this.cpc.answer("role.getMembers", ({ guildId, roleId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            if (!guild.roles.has(roleId)) return [];
            const role = guild.roles.get(roleId);
            const members = role.members.array();

            return members.map(m => new Member(m));
        });

        this.cpc.answer("getMember", ({ guildId, memberId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            if (!guild.members.has(memberId)) return;
            const member = guild.members.get(memberId);

            return new Member(member);
        });

        this.cpc.answer("member.getRoles", ({ guildId, memberId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            if (!guild.members.has(memberId)) return [];
            const member = guild.members.get(memberId);
            const roles = member.roles.array();

            return roles.map(m => new Role(m));
        });

        // it's already being checked on the worker if roles are allowed or disallowed!
        this.cpc.answer("member.addRole", async ({ guildId, memberId, roles }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            if (!guild.members.has(memberId)) return;
            const member = guild.members.get(memberId);

            await member.addRoles(roles.filter(r => guild.roles.has(r)));

            return new Member(member);
        });

        this.cpc.answer("member.removeRole", async ({ guildId, memberId, roles }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            if (!guild.members.has(memberId)) return;
            const member = guild.members.get(memberId);

            await member.removeRoles(roles.filter(r => guild.roles.has(r)));

            return new Member(member);
        });

        this.cpc.answer("getChannel", ({ guildId, channelId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            if (!guild.channels.has(channelId)) return;
            const channel = guild.channels.get(channelId);

            return new Channel(channel);
        });

        this.cpc.answer("channel.createInvite", async ({ guildId, channelId, options }) => {
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
        });

        this.cpc.answer("channel.send", async ({ guildId, channelId, content, embed }) => {
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

            if (message) {
                this.setMessage(message);
                return new Message(message);
            }
        });

        this.cpc.answer("guild.getMembers", ({ guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);
            const members = guild.members.array();

            return members.map(m => new Member(m));
        });

        this.cpc.answer("guild.getRoles", ({ guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            const roles = guild.roles.array();

            return roles.map(m => new Role(m));
        });

        this.cpc.answer("guild.getChannels", ({ guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            const channels = guild.channels.array().filter(c => c.type === "text");

            return channels.map(m => new Channel(m));
        });

        this.cpc.answer("guild.getEmojis", ({ guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            const emojis = guild.emojis.array();

            return emojis.map(m => new Emoji(m));
        });
    }

    setMessage(message) {
        const guild = message.guild;
        if (!this.message_cache.has(guild.id)) this.message_cache.set(guild.id, new Map);
        this.message_cache.get(guild.id).set(message.id, message);
    }

    async getMessage(guild, messageId) {
        if (this.message_cache.has(guild.id) && this.message_cache.get(guild.id).has(messageId)) {
            return this.message_cache.get(guild.id).get(messageId);
        }

        let channels = guild.channels.filter(c => c.type == "text").array();
        for (let current of channels) {
            let target = await current.fetchMessage(messageId);
            if (target) {
                this.setMessage(target);
                return target;
            }
        }
    }
}

module.exports = WorkerMethods;
