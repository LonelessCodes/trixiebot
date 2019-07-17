const { isOwner } = require("../../modules/util");
// eslint-disable-next-line no-unused-vars
const { Permissions, GuildMember } = require("discord.js");

const { FLAGS } = Permissions;

function ucFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const NAMES = new Map;
for (const key in FLAGS) {
    NAMES.set(FLAGS[key], key.split(/_/g).map(v => ucFirst(v.toLowerCase())).join(" ")); // most hacky but perfect
}

class CommandPermission {
    /**
     * @param {Array<number>} permissions 
     */
    constructor(permissions) {
        this.permissions = permissions;
    }

    /**
     * @param {GuildMember} member 
     */
    test(member) {
        for (const permission of this.permissions) {
            if (!member.hasPermission(permission, false, true, true)) return false;
        }
        return true;
    }

    toString() {
        return this.permissions.map(permission => NAMES.get(permission)).join(", ");
    }
}
CommandPermission.USER = new CommandPermission([]);
CommandPermission.ADMIN = new class extends CommandPermission {
    /**
     * @param {GuildMember} member 
     */
    test(member) {
        return member.hasPermission(FLAGS.MANAGE_GUILD, false, true, true) ||
            module.exports.OWNER.test(member);
    }
    toString() {
        return "Administrator or Manage Server";
    }
};
CommandPermission.OWNER = new class extends CommandPermission {
    test(member) {
        return isOwner(member);
    }
    toString() {
        return "Bot Owner";
    }
};

module.exports = CommandPermission;