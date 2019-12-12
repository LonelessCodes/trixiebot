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

// eslint-disable-next-line no-unused-vars
const Discord = require("discord.js");
const ParsedStream = require("./ParsedStream");

class StreamConfig extends ParsedStream {
    constructor(service, channel, nsfwChannel, sfwChannel, conf = {}) {
        super(service, conf.username || conf.name, conf.userId);

        /** @type {Discord.TextChannel} */
        this.channel = channel || null;
        /** @type {Discord.TextChannel} */
        this.nsfwChannel = nsfwChannel || null;
        /** @type {Discord.TextChannel} */
        this.sfwChannel = sfwChannel || null;
        this._id = conf._id || null;
    }

    get guild() {
        return (this.channel || this.nsfwChannel || this.sfwChannel || {}).guild;
    }

    /**
     * @param {boolean} nsfw
     * @returns {Discord.TextChannel}
     */
    getChannel(nsfw) {
        if (nsfw) {
            if (this.channel) return this.channel;
            if (this.nsfwChannel) return this.nsfwChannel;
        } else {
            if (this.channel) return this.channel;
            if (this.sfwChannel) return this.sfwChannel;
        }
    }

    /**
     * @param {boolean} nsfw
     * @returns {boolean}
     */
    getSendable(nsfw) {
        if (nsfw) {
            if (this.channel) return true;
            if (this.nsfwChannel) return true;
        } else {
            if (this.channel) return true;
            if (this.sfwChannel) return true;
        }
        return false;
    }
}

module.exports = StreamConfig;
