const { findArgs } = require("../modules/util/string");
const BaseCommand = require("./BaseCommand");
// eslint-disable-next-line no-unused-vars
const { Message, RichEmbed } = require("discord.js");
const BSON = require("bson");

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

class Reaction {
    constructor(r) {
        return {
            count: r.count,
            emoji: {
                animated: r.emoji.animated,
                name: r.emoji.name,
                id: r.emoji.id,
                identifier: r.emoji.identifier,
                createdAt: r.emoji.createdTimestamp,
                requiresColons: r.emoji.requiresColons,
                url: r.emoji.url
            }
        };
    }
}

class CustomCommand extends BaseCommand {
    /**
     * @param {*} manager 
     * @param {{ _id: string; guildId: string; type: number; trigger: string|RegExp; case_sensitive: boolean; code: string; cst?: BSON.Binary; errors: any[]; created_at: Date; modified_at: Date; created_by: string; disabled_channels: string[]; disabled: boolean; }} row
     */
    constructor(manager, row) {
        super();

        this._id = row._id;

        this.guildId = row.guildId;

        this.type = row.type;
        this.trigger = row.trigger;
        this.case_sensitive = row.case_sensitive;

        this.code = row.code;
        this.raw_cst = row.cst;
        this._cst = null;

        this.created_at = row.created_at;
        this.modified_at = row.modified_at;

        this.created_by = row.created_by;

        this.disabled_channels = row.disabled_channels;
        this.disabled = row.disabled;

        this.manager = manager;
    }

    get cst() {
        if (!this._cst) {
            this._cst = this.raw_cst ? BSON.deserialize(this.raw_cst.buffer) : null;
            this.raw_cst = null;
        }
        return this._cst;
    }

    /**
     * @param {Message} message 
     * @param {string} command_name 
     * @param {string} content 
     */
    async run(message, command_name, content) {
        if (!this.cst) return;

        const guild = message.guild;

        const msg = {
            msg: {
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
                reactions: message.reactions.array().map(r => new Reaction(r))
            },
            args: findArgs(content),
            guild: {
                id: guild.id,
                name: guild.name,
                createdAt: guild.createdTimestamp,
                icon: guild.iconURL,
                memberCount: guild.memberCount,
                ownerId: guild.ownerID
            }
        };

        const { error, embed, content: cont } = await this.manager.cpc.awaitAnswer("run", { id: this._id, text: this.code, cst: this.cst, message: msg });

        console.log(error, embed || cont);
        if (!error && (embed || cont)) {
            await message.channel.send(embed ? new RichEmbed(embed) : cont.toString());
        }
    }
}

module.exports = CustomCommand;