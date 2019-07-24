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

class TypingCache {
    constructor() {
        /**
         * @type {Map<string, number>}
         */
        this.channels = new Map;
    }

    startTyping(channel) {
        this.channels.set(channel.id, (this.channels.get(channel.id) || 0) + 1);
        return channel.startTyping();
    }

    stopTyping(channel, force = false) {
        if (force) {
            this.channels.delete(channel.id);
            return channel.stopTyping();
        }
        const v = (this.channels.get(channel.id) || 0) - 1;
        if (v === 0) {
            this.channels.delete(channel.id);
            return channel.stopTyping();
        }
    }
}

module.exports = new TypingCache;
