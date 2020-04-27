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
const ParsedStream = require("../stream/ParsedStream").default;
const OnlineStream = require("../stream/OnlineStream");
// eslint-disable-next-line no-unused-vars
const Stream = require("../stream/Stream").default;

class PiczelProcessor extends Processor {
    constructor(manager) {
        super(manager);

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.piczel\.tv|piczel\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async parseStreamer(url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.piczel\.tv|piczel\.tv)\/watch\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new ParsedStream(this);

        try {
            let channelPage = await this.request("streams/" + channel_name);
            if (channelPage.error || !channelPage.data[0] || !channelPage.data[0].user) return new ParsedStream(this, channel_name);

            channelPage = channelPage.data[0];

            const user_id = channelPage.user.id.toString();
            const username = channelPage.user.username;

            return new ParsedStream(this, username, user_id);
        } catch (err) {
            return new ParsedStream(this, channel_name);
        }
    }

    formatURL(channel, fat = false) {
        if (fat) return this.url + "/watch/**" + channel.username + "**";
        else return "https://" + this.url + "/watch/" + channel.username;
    }

    async request(api) {
        const r = await fetch(this.base + api);
        return await r.json();
    }

    async checkChanges() {
        // get all online channels
        try {
            const piczelOnline = await this.request("streams/?nsfw=true&live_only=false");
            if (piczelOnline.error) return log.error("Piczel error:", piczelOnline.error);

            const db_stream = this.manager.getServiceConfigsStream(this);

            db_stream.addListener("data", config => this.checkChange(piczelOnline, config));
            db_stream.once("error", log.error);
        } catch (_) { _; } // Piczel is down
    }

    /**
     * @param {any} piczelOnline
     * @param {Stream} savedConfig
     */
    async checkChange(piczelOnline, savedConfig) {
        const oldStream = this.online.find(oldstream =>
            savedConfig.userId === oldstream.userId &&
            savedConfig.guild.id === oldstream.guild.id);

        const streamPage = piczelOnline.find(streamPage => savedConfig.userId === streamPage.user.id.toString());
        if (!streamPage) {
            if (!savedConfig.messageId && !oldStream) return;
            // remove the channel from the recently online list
            this.emit("offline", oldStream || savedConfig);
        } else if (oldStream && !oldStream.curr_channel.equals(savedConfig.getChannel(streamPage.adult))) {
            // channel changed adult state and
            if (!savedConfig.getSendable(streamPage.adult)) this.emit("offline", oldStream);

            this.emit("change", new OnlineStream(oldStream, this.serializeRaw(streamPage)));
        } else {
            // channel changed and last message still posted
            if (!oldStream && savedConfig.lastChannelId && !savedConfig.lastChannel.equals(savedConfig.getChannel(streamPage.adult)))
                await savedConfig.delete();

            // if the channel was not recently online, set it online
            if (oldStream || savedConfig.messageId) return;
            if (!savedConfig.getSendable(streamPage.adult)) return;

            this.emit("online", new OnlineStream(savedConfig, this.serializeRaw(streamPage)));
        }
    }

    serializeRaw(raw) {
        return {
            username: raw.user.username,
            title: raw.title,
            followers: raw.follower_count,
            avatar: raw.user.avatar ? raw.user.avatar.avatar.url : null,
            nsfw: raw.adult,
            tags: raw.tags,
            thumbnail: `https://piczel.tv/static/screenshots/stream_${raw.id}.jpg`,
        };
    }

    get base() { return "https://piczel.tv/api/"; }
    get url() { return "piczel.tv"; }
    get name() { return "piczel"; }
    get display_name() { return "Piczel.tv"; }
}

module.exports = PiczelProcessor;
