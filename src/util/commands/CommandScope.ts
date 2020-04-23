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

import Discord from "discord.js";

export default class CommandScope extends Discord.BitField<"GUILD" | "DM"> {
    static hasScope(scope: CommandScope, channel: Discord.Channel): boolean {
        if (!scope.has(CommandScope.FLAGS.GUILD) && channel.type === "text") return false;
        if (!scope.has(CommandScope.FLAGS.DM) && channel.type === "dm") return false;
        return true;
    }

    static FLAGS = {
        GUILD: 1 << 0,
        DM: 1 << 1,
    };

    /**
     * Bitfield representing every scope combined
     */
    static ALL = CommandScope.FLAGS.DM | CommandScope.FLAGS.GUILD;

    /**
     * Bitfield representing the default scope
     */
    static DEFAULT = CommandScope.FLAGS.GUILD;
}
