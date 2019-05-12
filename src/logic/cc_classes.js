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
                everyone: message.mentions.everyone
            },
            pinned: message.pinned,
            reactions: Array.from(message.reactions.entries()).map(r => new Reaction({ ...r[1], id: r[0] }))
        };
    }
}

class Member {
    constructor(member) {
        const highestRole = member.highestRole;
        return {
            id: member.id,
            nickname: member.displayName,
            highestRole: {
                id: highestRole.id,
                permissions: highestRole.permissions,
                position: highestRole.position,
                color: highestRole.color,
                createdAt: highestRole.createdTimestamp,
                mentionable: highestRole.mentionable,
                name: highestRole.name,
            },
            joinedAt: member.joinedTimestamp,
            avatar: member.user.displayAvatarURL,
            bot: member.user.bot,
            createdAt: member.user.createdTimestamp,
            username: member.user.username,
            discriminator: member.user.discriminator,
            permissions: member.permissions.bitfield
        };
    }
}

class Channel {
    constructor(channel) {
        return {
            id: channel.id,
            name: channel.name,
            createdAt: channel.createdTimestamp,
            position: channel.position,
            nsfw: channel.nsfw,
            topic: channel.topic
        };
    }
}

class Role {
    constructor(role) {
        return {
            id: role.id,
            position: role.position,
            color: role.color,
            createdAt: role.createdTimestamp,
            mentionable: role.mentionable,
            name: role.name,
            permissions: role.permissions
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
            url: emoji.url
        };
    }
}

class Reaction {
    constructor(r) {
        return {
            count: r.count,
            emoji: new Emoji(r.emoji),
            id: r.id
        };
    }
}

module.exports = {
    Message, Reaction, Emoji, Role, Channel, Member
};