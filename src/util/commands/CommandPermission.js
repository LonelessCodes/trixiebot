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

const { isOwner } = require("../util");
// eslint-disable-next-line no-unused-vars
const { Permissions, GuildMember, User } = require("discord.js");

const { FLAGS } = Permissions;

function ucFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const NAMES = new Map;
for (const key in FLAGS) {
    NAMES.set(FLAGS[key], key.split(/_/g).map(v => ucFirst(v.toLowerCase())).join(" ")); // Most hacky but perfect
}

class CommandPermission {
    /**
     * @param {Array<number>} permissions
     */
    constructor(permissions) {
        this.permissions = permissions;
    }

    /**
     * @param {GuildMember|User} member
     * @returns {boolean}
     */
    test(member) {
        for (const permission of this.permissions) {
            if (member instanceof User) return false;
            if (!member.hasPermission(permission)) return false;
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
     * @param {GuildMember|User} member
     * @returns {boolean}
     */
    test(member) {
        if (member instanceof User) return false;
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
