// eslint-disable-next-line no-unused-vars
const { Collection, User, Guild, Client, GuildMember, Role } = require("discord.js");

/**
 * TODO: parse USER MENTIONS RIGHT
 */

class MessageMentions {
    /**
     * New Custom message mention finder
     * @param {string} content 
     * @param {Guild} guild 
     */
    constructor(content, guild) {
        /**
         * The client the message is from
         * @type {Client}
         * @readonly
        */
        this.client = guild.client;

        /**
         * The guild the message is in
         * @type {?Guild}
         * @readonly
         */
        this.guild = guild;

        /**
         * The initial message content
         * @type {string}
         * @readonly
         * @private
         */
        this._content = content;

        /**
         * Whether `@everyone` or `@here` were mentioned
         * @type {boolean}
         */
        this.everyone = MessageMentions.EVERYONE_PATTERN.test(content);

        /**
         * Any users that were mentioned
         * @type {Collection<string, User>}
         */
        this.users = new Collection();
        let matches = content.match(MessageMentions.USERS_PATTERN) || [];
        for (const id of matches) {
            const user = guild.client.users.get(id.replace(/<@!?/, "").replace(">", ""));
            if (user) this.users.set(user.id, user);
        }

        for (let str of content.split(MessageMentions.USERS_PATTERN)) {
            str = str.trim();
            const matches = str.match(MessageMentions.USER_TAG_PATTERN) || [];
            for (let match of matches) {
                match = match.trim();
                const user = guild.client.users.find(user => user.tag === match);
                if (user) this.users.set(user.id, user);
            }

            for (let displayName of str.split(MessageMentions.USER_TAG_PATTERN)) {
                displayName = displayName.trim();
                const member = guild.members.find(member => member.displayName.startsWith(displayName));
                if (member) this.users.set(member.user.id, member.user);
                else {
                    const displayNameLowercase = displayName.toLowerCase();
                    const member = guild.members.find(member => member.displayName.toLowerCase().startsWith(displayNameLowercase));
                    if (member) this.users.set(member.user.id, member.user);
                }
            }
        }

        // /**
        //  * Any roles that were mentioned
        //  * @type {Collection<string, Role>}
        //  */
        // this.roles = new Collection();
        // matches = content.match(MessageMentions.ROLES_PATTERN) || [];
        // for (const id of matches) {
        //     const role = guild.roles.get(id);
        //     if (role) this.roles.set(role.id, role);
        // }

        /**
         * Cached members for {@link MessageMention#members}
         * @type {?Collection<string, GuildMember>}
         * @private
         */
        this._members = null;
    }

    /**
     * Any members that were mentioned (only in {@link TextChannel}s)
     * @type {?Collection<string, GuildMember>}
     * @readonly
     */
    get members() {
        if (this._members) return this._members;

        this._members = new Collection();
        this.users.forEach(user => {
            const member = this.guild.member(user);
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

/**
 * Regular expression that globally matches user mentions like `Loneless#0893`
 * @type {RegExp}
 */
MessageMentions.USER_TAG_PATTERN = /@?([^@#:]{2,32})#([0-9]{4})/g;

// /**
//  * Regular expression that globally matches role mentions like `<@&297577916114403338>`
//  * @type {RegExp}
//  */
// MessageMentions.ROLES_PATTERN = /<@&([0-9]+)>/g;

// /**
//  * Regular expression that globally matches channel mentions like `<#222079895583457280>`
//  * @type {RegExp}
//  */
// MessageMentions.CHANNELS_PATTERN = /<#([0-9]+)>/g;

module.exports = MessageMentions;