const { Collection } = require("discord.js");

/**
 * TODO: parse USER MENTIONS RIGHT
 */

class MessageMentions {
    constructor(msg, guild) {
        this._guild = guild;

        this.everyone = MessageMentions.EVERYONE_PATTERN.test(msg);

        this.users = new Collection();
        let matches = msg.match(MessageMentions.USERS_PATTERN) || [];
        for (const id of matches) {
            const user = guild.client.users.get(id.replace(/<@!?/, "").replace(">", ""));
            if (user) this.users.set(user.id, user);
        }
        matches = msg.match(MessageMentions.STRING_USER_PATTERN) || [];
        for (const name of matches) {
            const lowercase = name.toLowerCase();
            const member = guild.members.find(member => `${member.user.username.toLowerCase()}#${member.user.discriminator}` === lowercase);
            if (member) this.users.set(member.user.id, member.user);
        }
        const lowercase = msg.toLowerCase().trim();
        const member = guild.members.find(member => member.displayName.toLowerCase() === lowercase);
        if (member) this.users.set(member.user.id, member.user);

        this.roles = new Collection();
        matches = msg.match(MessageMentions.ROLES_PATTERN) || [];
        for (const id of matches) {
            const role = guild.roles.get(id);
            if (role) this.roles.set(role.id, role);
        }

        this.channels = new Collection();
        matches = msg.match(MessageMentions.CHANNELS_PATTERN) || [];
        for (const id of matches) {
            const channel = guild.client.channels.get(id);
            if (channel) this.roles.set(channel.id, channel);
        }
    }

    get members() {
        if (this._members) return this._members;

        this._members = new Collection();
        this.users.forEach(user => {
            const member = this._guild.member(user);
            if (member) this._members.set(member.user.id, member);
        });
        return this._members;
    }
}

/**
 * Regular expression that globally matches `@everyone` and `@here`
 * @type {RegExp}
 */
MessageMentions.EVERYONE_PATTERN = /@(everyone|here)/g;

/**
 * Regular expression that globally matches user mentions like `<@81440962496172032>`
 * @type {RegExp}
 */
MessageMentions.USERS_PATTERN = /<@!?([0-9]+)>/g;
MessageMentions.STRING_USER_PATTERN = /(([^\t\f\r\n\v\s@#:`] ?){2,32}#[0-9]{4})/g;

/**
 * Regular expression that globally matches role mentions like `<@&297577916114403338>`
 * @type {RegExp}
 */
MessageMentions.ROLES_PATTERN = /<@&([0-9]+)>/g;

/**
 * Regular expression that globally matches channel mentions like `<#222079895583457280>`
 * @type {RegExp}
 */
MessageMentions.CHANNELS_PATTERN = /<#([0-9]+)>/g;

module.exports = MessageMentions;