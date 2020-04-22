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

const fetch = require("node-fetch");
const log = require("../../../log").default.namespace("alert cmd");

const Processor = require("./Processor");
const ParsedStream = require("../stream/ParsedStream");
const OnlineStream = require("../stream/OnlineStream");
// eslint-disable-next-line no-unused-vars
const Stream = require("../stream/Stream");

class PicartoProcessor extends Processor {
    constructor(manager) {
        super(manager);

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.picarto\.tv|picarto\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,25}\b/.test(url);
    }

    async parseStreamer(url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.picarto\.tv|picarto\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,25})\b/;

        const [, username] = regexp.exec(url) || [];

        if (!username) return new ParsedStream(this);

        try {
            const streamPage = await this.request("channel/name/" + username);

            const userid = streamPage.user_id.toString();
            return new ParsedStream(this, username, userid);
        } catch (err) {
            return new ParsedStream(this, username);
        }
    }

    formatURL(stream, fat = false) {
        if (fat) return this.url + "/**" + stream.username + "**";
        else return "https://" + this.url + "/" + stream.username;
    }

    // All private methods

    async request(api) {
        const r = await fetch(this.base + api);
        return await r.json();
    }

    async checkChanges() {
        // get all online channels
        try {
            /** @type {any[]} */
            const picartoOnline = await this.request("online?adult=true");

            const db_stream = this.manager.getServiceConfigsStream(this);

            db_stream.addListener("data", config => this.checkChange(picartoOnline, config));
            db_stream.once("end", () => { /* Do nothing */ });
            db_stream.once("error", err => { log(err); });
        } catch (_) { _; } // Picarto is down
    }

    /**
     * @param {any[]} picartoOnline
     * @param {Stream} newStream
     */
    async checkChange(picartoOnline, newStream) {
        const oldStream = this.online.find(oldStream =>
            newStream.userId === oldStream.userId &&
            newStream.guild.id === oldStream.guild.id);

        let streamPage = picartoOnline.find(streamPage => newStream.userId === streamPage.user_id.toString());
        if (!streamPage) {
            if (!newStream.messageId && !oldStream) return;
            // remove the channel from the recently online list
            this.emit("offline", oldStream || newStream);
        } else if (oldStream && !oldStream.curr_channel.equals(newStream.getChannel(streamPage.adult))) {
            // channel changed adult state and
            if (!newStream.getSendable(streamPage.adult)) this.emit("offline", oldStream);

            try {
                this.emit("change", new OnlineStream(oldStream, await this.serializeRaw(streamPage)));
            } catch (_) { _; } // Picarto is down
        } else {
            // channel changed and last message still posted
            if (!oldStream && newStream.lastChannelId && !newStream.lastChannel.equals(newStream.getChannel(streamPage.adult)))
                await newStream.delete();

            // if the channel was not recently online, set it online
            if (oldStream || newStream.messageId) return;
            if (!newStream.getSendable(streamPage.adult)) return;

            try {
                this.emit("online", new OnlineStream(newStream, await this.serializeRaw(streamPage)));
            } catch (_) { _; } // Picarto is down
        }
    }

    async serializeRaw(raw) {
        raw = await this.request("channel/id/" + raw.user_id);

        return {
            username: raw.name,
            title: raw.title,
            followers: raw.followers,
            totalviews: raw.viewers_total,
            avatar: raw.avatar,
            nsfw: raw.adult,
            category: raw.category,
            tags: raw.tags,
            thumbnail: raw.thumbnails.web_large,
        };
    }

    get base() { return "https://api.picarto.tv/v1/"; }
    get url() { return "picarto.tv"; }
    get name() { return "picarto"; }
    get display_name() { return "Picarto"; }
    get color() { return 0x1DA456; }
}

module.exports = PicartoProcessor;
