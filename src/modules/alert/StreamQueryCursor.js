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

const Stream = require("./stream/Stream");
const StreamConfig = require("./stream/StreamConfig");

class StreamQueryCursor {
    constructor(db_cursor, manager) {
        this.manager = manager;
        this._cursor = db_cursor;
    }

    addListener(scope, handler) {
        switch (scope) {
            case "data":
                this._cursor.addListener("data", config => {
                    const channel = this.process(config);
                    if (!channel) return;

                    handler(channel);
                });
                break;
            default:
                this._cursor.addListener(scope, handler);
                break;
        }
    }

    once(scope, handler) {
        switch (scope) {
            case "data":
                this._cursor.once("data", raw => {
                    const channel = this.process(raw);
                    if (!channel) return;

                    handler(channel);
                });
                break;
            default:
                this._cursor.once(scope, handler);
                break;
        }
    }

    /**
     * @returns {Promise<Stream[]>}
     */
    async toArray() {
        const arr = await this._cursor.toArray();
        return arr.map(c => this.process(c)).filter(c => !!c);
    }

    /**
     * @param {any} raw
     * @returns {Stream}
     */
    process(raw) {
        const service = this.manager.services_mapped[raw.service];
        if (!service) return;

        const guild = this.manager.client.guilds.get(raw.guildId);
        if (!guild) return;
        if (!guild.available) return;

        const def_channel = guild.channels.get(raw.channelId);
        const nsfw_channel = guild.channels.get(raw.nsfwChannelId);
        const sfw_channel = guild.channels.get(raw.sfwChannelId);
        if (!def_channel && !nsfw_channel && !sfw_channel) {
            this.manager.removeStreamConfig(new StreamConfig(service, null, null, null, raw));
            return;
        }

        const online = this.manager.online.find(online =>
            online.service.name === service.name &&
            online.guild.id === guild.id &&
            online.userId === raw.userId);
        if (online) return online;

        return new Stream(this.manager, service, def_channel, nsfw_channel, sfw_channel, raw);
    }
}

module.exports = StreamQueryCursor;
