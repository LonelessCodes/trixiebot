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

const { EventEmitter } = require("events");
const Channel = require("../Channel");
// eslint-disable-next-line no-unused-vars
const OnlineChannel = require("../OnlineChannel");
// eslint-disable-next-line no-unused-vars
const Config = require("../Config");

class StreamProcessor extends EventEmitter {
    /**
     * @param {Manager} manager
     */
    constructor(manager) {
        super();
        this.manager = manager;
        this.database = manager.database;
        this.client = manager.client;

        /** @type {OnlineChannel[]} */
        this.online = [];

        this.on("online", channel => this.online.push(channel));
        this.on("offline", channel => this.removeChannel(channel));
    }

    testURL() {
        return false;
    }

    async getDBEntry(guild, userId) {
        return await this.database.findOne({
            service: this.name,
            guildId: guild.id,
            userId: userId,
        });
    }

    formatURL() { return ""; }

    addChannel(config) {
        return new Channel(this.manager, this, config.channel, config);
    }

    /**
     * @param {Config|Channel} config
     */
    removeChannel(config) {
        if (config.channel) {
            const oldChannel = this.online.findIndex(oldChannel =>
                oldChannel.channel.guild.id === config.channel.guild.id &&
                oldChannel.userId === config.userId);
            if (oldChannel >= 0)
                this.online.splice(oldChannel, 1);
        } else if (config._id) {
            const oldChannel = this.online.findIndex(oldChannel => oldChannel._id === config._id);
            if (oldChannel >= 0)
                this.online.splice(oldChannel, 1);
        }
    }
}

module.exports = StreamProcessor;
