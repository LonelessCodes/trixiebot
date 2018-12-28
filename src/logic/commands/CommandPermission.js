const { isOwner } = require("../../modules/util");
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

module.exports = {
    USER: new CommandPermission([]),
    ADMIN: new class extends CommandPermission {
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
    },
    OWNER: new class extends CommandPermission {
        test(member) {
            return isOwner(member);
        }
        toString() {
            return "Bot Owner";
        }
    },
    CommandPermission
};