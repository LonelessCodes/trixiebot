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
const { APIErrors } = require("discord.js/src/util/Constants");
const toEmoji = require("emoji-name-map");
const { Member, Channel, Emoji, Role, Message } = require("./cc_classes");

function makeError(name, message, context) {
    context = context ? " " + context : "";

    return Object.assign(new Error, { name, message: message + context });
}

async function convertError(promise, context) {
    try {
        return await promise;
    } catch (err) {
        if (err instanceof Discord.DiscordAPIError) {
            switch (err.code) {
                case APIErrors.MISSING_ACCESS: throw makeError("Missing Access", "Trixie isn't allowed to access this resource.", context);
                case APIErrors.MISSING_PERMISSIONS: throw makeError("Missing Permissions", "Trixie doesn't have permissions to perform this action.", context);
                case APIErrors.UNKNOWN_MESSAGE: throw makeError("Unknown Message", "The message was not found or was possibly deleted.", context);
                case APIErrors.UNKNOWN_CHANNEL: throw makeError("Unknown Channel", "The channel was not found or was possibly deleted.", context);
                case APIErrors.UNKNOWN_MEMBER: throw makeError("Unknown Member", "The member was not found or possibly left the server.", context);
                case APIErrors.UNKNOWN_ROLE: throw makeError("Unknown Role", "The role was not found or was possibly deleted.", context);
                case APIErrors.UNKNOWN_USER: throw makeError("Unknown User", "The user was not found.", context);
                case APIErrors.UNKNOWN_EMOJI: throw makeError("Unknown Emoji", "The emoji was not found or was possibly deleted.", context);
                case APIErrors.MAXIMUM_REACTIONS: throw makeError("Maximum Reactions", "Maximum number of reactions on this message was reached (20).", context);
                case APIErrors.UNAUTHORIZED: throw makeError("Unauthorized", "Trixie is not authorized to access this resource.", context);
                case APIErrors.CANNOT_EDIT_MESSAGE_BY_OTHER: throw makeError("Send Error", "Cannot edit a message authored by another user.", context);
                case APIErrors.CANNOT_SEND_EMPTY_MESSAGE: throw makeError("Send Error", "Cannot send an empty message.", context);
                case APIErrors.CANNOT_MESSAGE_USER: throw makeError("Send Error", "Cannot send messages to this user.", context);
                case APIErrors.CANNOT_SEND_MESSAGES_IN_VOICE_CHANNEL: throw makeError("Send Error", "Cannot send messages in a voice channel.", context);
                case APIErrors.CANNOT_EXECUTE_ON_SYSTEM_MESSAGE: throw makeError("Message Action Error", "Cannot execute action on a system message.", context);
                case APIErrors.REACTION_BLOCKED: throw makeError("Reaction Blocked", "Reaction was/is blocked.", context);
                case APIErrors.EMBED_DISABLED: throw makeError("Embed Disabled", "Use of embeds is disabled in this channel.", context);
                default: throw makeError("Discord API Error", err.message || err.name, context);
            }
        }
        throw Object.assign(err, { message: err.message + (context ? " " + context : "") });
    }
}

class WorkerMethods {
    constructor(client, cpc) {
        this.client = client;

        /** @type {Map<string, Map<string, Discord.Message>>} */
        this.message_cache = new Map;

        this.cpc = cpc;

        // METHODS

        this.cpc.answer("emoji.get", ({ emojiId, guildId }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild.emojis.cache.has(emojiId)) return;
            return new Emoji(guild.emojis.cache.get(emojiId));
        });

        this.cpc.answer("emoji.addRole", async ({ emojiId, guildId, roles }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild.emojis.cache.has(emojiId)) return;
            let emoji = guild.emojis.cache.get(emojiId);

            roles = roles.filter(role => guild.roles.cache.has(role)).map(role => guild.roles.cache.get(role));
            emoji = await convertError(emoji.roles.add(roles));

            return new Emoji(emoji);
        });

        this.cpc.answer("emoji.removeRole", async ({ emojiId, guildId, roles }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild.emojis.cache.has(emojiId)) return;
            let emoji = guild.emojis.cache.get(emojiId);

            roles = roles.filter(role => guild.roles.cache.has(role)).map(role => guild.roles.cache.get(role));
            emoji = await convertError(emoji.roles.remove(roles));

            return new Emoji(emoji);
        });

        this.cpc.answer("reaction.getMembers", async ({ messageId, reactionId, guildId }) => {
            if (!this.client.guilds.cache.has(guildId)) return [];
            const guild = this.client.guilds.cache.get(guildId);
            await convertError(guild.members.fetch());

            const m = await convertError(this.getMessage(guild, messageId));
            if (!m) return [];

            if (!m.reactions.cache.has(reactionId)) return [];
            const users = await m.reactions.cache.get(reactionId).users.fetch();
            const members = await convertError(Promise.all(users.cache.map(u => guild.members.fetch(u))));

            return members.filter(m => !!m).map(m => new Member(m));
        });

        this.cpc.answer("message.get", async ({ messageId, guildId }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);

            const m = await convertError(this.getMessage(guild, messageId));
            if (!m) return;

            return new Message(m);
        });

        this.cpc.answer("message.delete", async ({ messageId, guildId }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);

            const m = await convertError(this.getMessage(guild, messageId));
            if (!m) return;

            if (m.author.id === this.client.user.id || m.channel.permissionsFor(guild.me).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
                await convertError(m.delete());
        });

        this.cpc.answer("message.edit", async ({ messageId, guildId, embed, content }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);

            const m = await convertError(this.getMessage(guild, messageId));
            if (!m) return;

            if (m.author.id !== this.client.user.id) return;

            let message;
            if (embed && content) {
                message = await convertError(m.edit(content, { embed: new Discord.MessageEmbed(embed) }));
            } else if (embed) {
                message = await convertError(m.edit({ embed: new Discord.MessageEmbed(embed) }));
            } else if (content) {
                message = await convertError(m.edit(content));
            } else message = m;

            this.setMessage(message);

            return new Message(message);
        });

        this.cpc.answer("message.react", async ({ messageId, guildId, emojis }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);

            const m = await convertError(this.getMessage(guild, messageId));
            if (!m) return;

            for (let emoji of emojis) {
                if (guild.emojis.cache.has(emoji)) {
                    await m.react(guild.emojis.cache.get(emoji)).catch(() => { /* Do nothing */ });
                } else {
                    const e = toEmoji.get(emoji);
                    if (e) await m.react(e).catch(() => { /* Do nothing */ });
                    else await m.react(emoji).catch(() => { /* Do nothing */ });
                }
            }
        });

        this.cpc.answer("role.get", ({ guildId, roleId }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);

            if (!guild.roles.cache.has(roleId)) return;
            return new Role(guild.roles.cache.get(roleId));
        });

        this.cpc.answer("role.getMembers", async ({ guildId, roleId }) => {
            if (!this.client.guilds.cache.has(guildId)) return [];
            const guild = this.client.guilds.cache.get(guildId);
            await convertError(guild.members.fetch());

            if (!guild.roles.cache.has(roleId)) return [];
            const role = guild.roles.cache.get(roleId);

            return role.members.map(m => new Member(m));
        });

        this.cpc.answer("member.get", async ({ guildId, memberId }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);

            try {
                const member = await guild.members.fetch(memberId);
                return new Member(member);
            } catch { /* Do nothing */ }
        });

        this.cpc.answer("member.getRoles", async ({ guildId, memberId }) => {
            if (!this.client.guilds.cache.has(guildId)) return [];
            const guild = this.client.guilds.cache.get(guildId);

            const member = await convertError(guild.members.fetch(memberId));

            return member.roles.cache.map(m => new Role(m));
        });

        // it's already being checked on the worker if roles are allowed or disallowed!
        this.cpc.answer("member.addRole", async ({ guildId, memberId, roles }) => {
            if (!this.client.guilds.cache.has(guildId)) return [];
            const guild = this.client.guilds.cache.get(guildId);

            const member = await convertError(guild.members.fetch(memberId));

            return new Member(
                await convertError(member.roles.add(roles.filter(r => guild.roles.cache.has(r))))
            );
        });

        this.cpc.answer("member.removeRole", async ({ guildId, memberId, roles }) => {
            if (!this.client.guilds.cache.has(guildId)) return [];
            const guild = this.client.guilds.cache.get(guildId);

            const member = await convertError(guild.member.fetch(memberId));

            return new Member(
                await convertError(member.roles.remove(roles.filter(r => guild.roles.cache.has(r))))
            );
        });

        this.cpc.answer("channel.get", ({ guildId, channelId }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);

            if (!guild.channels.cache.has(channelId)) return;
            const channel = guild.channels.cache.get(channelId);

            return new Channel(channel);
        });

        this.cpc.answer("channel.createInvite", async ({ guildId, channelId, options }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);

            if (!guild.channels.cache.has(channelId)) return;
            const channel = guild.channels.cache.get(channelId);

            if (!channel.permissionsFor(guild.me).has(Discord.Permissions.FLAGS.CREATE_INSTANT_INVITE))
                return;

            const invite = await convertError(channel.createInvite(options));
            if (!invite) return;

            return invite.url;
        });

        this.cpc.answer("channel.send", async ({ guildId, channelId, content, embed }) => {
            if (!this.client.guilds.cache.has(guildId)) return;
            const guild = this.client.guilds.cache.get(guildId);

            if (!guild.channels.cache.has(channelId)) return;
            const channel = guild.channels.cache.get(channelId);

            let message;
            if (embed && content) {
                message = await convertError(channel.send(content, { embed: new Discord.MessageEmbed(embed) }));
            } else if (embed) {
                message = await convertError(channel.send({ embed: new Discord.MessageEmbed(embed) }));
            } else if (content) {
                message = await convertError(channel.send(content));
            }

            if (message) {
                this.setMessage(message);
                return new Message(message);
            }
        });

        this.cpc.answer("guild.getMembers", async ({ guildId }) => {
            if (!this.client.guilds.cache.has(guildId)) return [];
            const guild = this.client.guilds.cache.get(guildId);
            await convertError(guild.members.fetch());

            return guild.members.cache.map(m => new Member(m));
        });

        this.cpc.answer("guild.getRoles", ({ guildId }) => {
            if (!this.client.guilds.cache.has(guildId)) return [];
            const guild = this.client.guilds.cache.get(guildId);

            return guild.roles.cache.map(m => new Role(m));
        });

        this.cpc.answer("guild.getChannels", ({ guildId }) => {
            if (!this.client.guilds.cache.has(guildId)) return [];
            const guild = this.client.guilds.cache.get(guildId);

            const channels = guild.channels.cache.array().filter(c => c.type === "text");

            return channels.map(m => new Channel(m));
        });

        this.cpc.answer("guild.getEmojis", ({ guildId }) => {
            if (!this.client.guilds.cache.has(guildId)) return [];
            const guild = this.client.guilds.cache.get(guildId);

            return guild.emojis.cache.map(m => new Emoji(m));
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

        const channels = guild.channels.cache.array().filter(c => c.type == "text");
        for (let current of channels) {
            let target = await current.messages.fetch(messageId);
            if (target) {
                this.setMessage(target);
                return target;
            }
        }
    }
}

module.exports = WorkerMethods;
