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
// eslint-disable-next-line no-unused-vars
const OnlineStream = require("../stream/OnlineStream");
// eslint-disable-next-line no-unused-vars
const StreamConfig = require("../stream/StreamConfig");
// eslint-disable-next-line no-unused-vars
const ParsedStream = require("../stream/ParsedStream").default;

class StreamProcessor extends EventEmitter {
    /**
     * @param {Manager} manager
     */
    constructor(manager) {
        super();
        this.manager = manager;
        this.database = manager.database;
        this.client = manager.client;

        /** @type {OnlineStream[]} */
        this.online = [];

        this.on("online", stream => this.online.push(stream));
        this.on("change", stream => {
            const old = this.online.findIndex(old => old.userId === stream.userId && old.guild.id === stream.guild.id);
            if (old >= 0) this.online.splice(old, 1);
            this.online.push(stream);
        });
        this.on("offline", stream => this.removeStream(stream));
    }

    testURL() {
        return false;
    }

    /**
     * @param {string} url
     * @returns {Promise<ParsedStream>}
     */
    // eslint-disable-next-line require-await
    async getStreamer(url) {
        url;
    }

    formatURL() { return ""; }

    /**
     * @param {StreamConfig} config
     */
    addStreamConfig(config) {
        config;
        /* Do nothing */
    }

    /**
     * @param {StreamConfig} config
     */
    removeStreamConfig(config) {
        this.removeStream(config);
    }

    /**
     * @param {StreamConfig} config
     */
    removeStream(config) {
        if (config.guild) {
            const oldStream = this.online.findIndex(oldStream =>
                oldStream.guild.id === config.guild.id &&
                oldStream.userId === config.userId);
            if (oldStream >= 0)
                this.online.splice(oldStream, 1);
        } else if (config._id) {
            const oldStream = this.online.findIndex(oldStream => oldStream._id === config._id);
            if (oldStream >= 0)
                this.online.splice(oldStream, 1);
        }
    }
}

module.exports = StreamProcessor;
