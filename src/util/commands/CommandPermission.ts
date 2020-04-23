/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

import { isOwner } from "../util";
import { ucFirst } from "../string";
import Discord from "discord.js";

const FLAGS = Discord.Permissions.FLAGS;

const NAMES: Map<number, string> = new Map();
for (const key in FLAGS) {
    NAMES.set(FLAGS[key as Discord.PermissionString], ucFirst(key.replace(/_/g, " ").toLowerCase())); // Most hacky but perfect
}

export default class CommandPermission {
    public permissions: number[];

    constructor(permissions: number[] = []) {
        this.permissions = permissions;
    }

    test(member: Discord.UserResolvable): boolean {
        if (this.permissions.length === 0) true;

        if (!(member instanceof Discord.GuildMember)) return false;
        for (const permission of this.permissions) {
            if (!member.hasPermission(permission)) return false;
        }
        return true;
    }

    toString() {
        return this.permissions.map(permission => NAMES.get(permission)).join(", ");
    }

    static USER = new CommandPermission();
    static ADMIN = new (class extends CommandPermission {
        test(member: Discord.UserResolvable): boolean {
            if (!(member instanceof Discord.GuildMember)) return false;
            return member.hasPermission(FLAGS.MANAGE_GUILD, { checkAdmin: true, checkOwner: true }) || isOwner(member);
        }
        toString() {
            return "Administrator or Manage Server";
        }
    })();
    static OWNER = new (class extends CommandPermission {
        test(member: Discord.UserResolvable) {
            return isOwner(member);
        }
        toString() {
            return "Bot Owner";
        }
    })();
}
