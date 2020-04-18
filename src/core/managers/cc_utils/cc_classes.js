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

class Attachment {
    constructor(attach) {
        return {
            id: attach.id,
            filename: attach.name,
            filesize: attach.size,
            height: attach.height,
            width: attach.width,
            url: attach.url,
        };
    }
}

class Message {
    constructor(message) {
        return {
            id: message.id,
            member: new Member(message.member),
            channel: new Channel(message.channel),
            text: message.content,
            createdAt: message.createdTimestamp,
            editedAt: message.editedTimestamp,
            mentions: {
                members: message.mentions.members.array().map(m => new Member(m)),
                channels: message.mentions.channels.array().map(c => new Channel(c)),
                roles: message.mentions.roles.array().map(c => new Role(c)),
                everyone: message.mentions.everyone,
            },
            pinned: message.pinned,
            reactions: message.reactions.cache.map(r => new Reaction({ ...r[1], id: r[0] })),
            attachments: message.attachments.array().map(a => new Attachment(a)),
        };
    }
}

class Member {
    constructor(member) {
        const highestRole = member.roles.highest;
        return {
            id: member.id,
            nickname: member.displayName,
            highestRole: {
                id: highestRole.id,
                permissions: highestRole.permissions,
                position: highestRole.rawPosition,
                color: highestRole.color,
                createdAt: highestRole.createdTimestamp,
                mentionable: highestRole.mentionable,
                name: highestRole.name,
            },
            joinedAt: member.joinedTimestamp,
            avatar: member.user.displayAvatarURL({ size: 1024, dynamic: true }),
            bot: member.user.bot,
            createdAt: member.user.createdTimestamp,
            username: member.user.username,
            discriminator: member.user.discriminator,
            permissions: member.permissions.bitfield,
        };
    }
}

class Channel {
    constructor(channel) {
        return {
            id: channel.id,
            name: channel.name,
            createdAt: channel.createdTimestamp,
            position: channel.rawPosition,
            nsfw: channel.nsfw,
            topic: channel.topic,
        };
    }
}

class Role {
    constructor(role) {
        return {
            id: role.id,
            position: role.rawPosition,
            color: role.color,
            createdAt: role.createdTimestamp,
            mentionable: role.mentionable,
            name: role.name,
            permissions: role.permissions,
        };
    }
}

class Emoji {
    constructor(emoji) {
        return {
            animated: emoji.animated,
            name: emoji.name,
            id: emoji.id,
            identifier: emoji.identifier,
            createdAt: emoji.createdTimestamp,
            requiresColons: emoji.requiresColons,
            url: emoji.url,
            roles: emoji.roles.map(r => new Role(r)),
        };
    }
}

class Reaction {
    constructor(r) {
        return {
            count: r.count,
            emoji: new Emoji(r.emoji),
            id: r.id,
        };
    }
}

module.exports = {
    Message, Reaction, Emoji, Role, Channel, Member,
};
