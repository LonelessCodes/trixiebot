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

const Channel = require("./Channel");
const Config = require("./Config");

class ChannelQueryCursor {
    constructor(db_cursor, manager, service) {
        this.manager = manager;
        this.service = service;
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
                this._cursor.once("data", config => {
                    const channel = this.process(config);
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
     * @returns {Channel[]}
     */
    async toArray() {
        const arr = await this._cursor.toArray();
        return arr.map(c => this.process(c)).filter(c => !!c);
    }

    /**
     * @param {any} config
     * @returns {Channel}
     */
    process(config) {
        const guild = this.manager.client.guilds.get(config.guildId);
        if (!guild) {
            return null;
        }
        if (!guild.available) return null;

        const g_channel = guild.channels.get(config.channelId);
        if (!g_channel) {
            this.manager.removeChannel(new Config(this.service, null, config.name, config.userId, config._id));
            return null;
        }

        const online = this.manager.online.find(online =>
            online.service === this.service.name &&
            online.channel.id === g_channel.id &&
            online.userId === config.userId);
        if (online) return online;

        return new Channel(this.manager, this.service, g_channel, config);
    }
}

module.exports = ChannelQueryCursor;
