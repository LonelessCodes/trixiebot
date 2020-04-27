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
const OnlineStream = require("../stream/OnlineStream").default;
// eslint-disable-next-line no-unused-vars
const Stream = require("../stream/Stream").default;

class SmashcastProcessor extends Processor {
    constructor(manager) {
        super(manager);

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.smashcast\.tv|smashcast\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async parseStreamer(url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.smashcast\.tv|smashcast\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new ParsedStream(this);

        try {
            const streamPage = await this.request("user/" + channel_name);
            if (streamPage.user_name === null) return new ParsedStream(this, channel_name);

            const user_id = streamPage.user_id;
            const username = streamPage.user_name;

            return new ParsedStream(this, username, user_id);
        } catch (err) {
            return new ParsedStream(this, channel_name);
        }
    }

    formatURL(stream, fat = false) {
        if (fat) return this.url + "/**" + stream.username + "**";
        else return "https://" + this.url + "/" + stream.username;
    }

    async request(api) {
        const r = await fetch(this.base + api);
        const json = await r.json();
        if (json.error == true) throw new Error(json.error_msg);
        return json;
    }

    async checkChanges() {
        const channels = await this.manager.getServiceConfigsStream(this).toArray();
        if (channels.length === 0) return;

        const set = new Set(channels.map(c => c.username));

        try {
            const online_channels = await this.request("media/live/" + Array.from(set).join(","));

            const online = online_channels.livestream.filter(stream => stream.media_is_live !== "0");

            for (let config of channels) await this.checkChange(config, online).catch(err => log.error(err));
        } catch (_) { _; } // Smashcast is down
    }

    /**
     * @param {Stream} config
     * @param {any[]} online_streams
     */
    async checkChange(config, online_streams) {
        const oldStream = this.online.find(oldStream =>
            config.userId === oldStream.userId &&
            config.guild.id === oldStream.guild.id);

        const stream = online_streams.find(stream => config.userId === stream.media_user_id);
        if (!stream) {
            if (!config.messageId && !oldStream) return;
            // remove the channel from the recently online list
            this.emit("offline", oldStream || config);
        } else if (oldStream && !oldStream.curr_channel.equals(config.getChannel(!!stream.media_mature))) {
            // channel changed adult state and
            if (!config.getSendable(!!stream.media_mature)) this.emit("offline", oldStream);

            this.emit("change", new OnlineStream(config, await this.serializeRaw(stream)));
        } else {
            // channel changed and last message still posted
            if (!oldStream && config.lastChannelId && !config.lastChannel.equals(config.getChannel(!!stream.media_mature)))
                await config.delete();

            // if the channel was not recently online, set it online
            if (oldStream || config.messageId) return;
            if (!config.getSendable(!!stream.media_mature)) return;

            this.emit("online", new OnlineStream(config, await this.serializeRaw(stream)));
        }
    }

    async serializeRaw(stream) {
        const views = await this.request("media/views/" + stream.channel.user_name);
        const media_base = "https://edge.sf.hitbox.tv";

        return {
            username: stream.user_name,
            totalviews: views.total_live_views ? parseInt(views.total_live_views) : 0,
            title: stream.media_status || stream.media_title,
            avatar: media_base + stream.channel.user_logo,
            followers: parseInt(stream.channel.followers),
            thumbnail: media_base + stream.media_thumbnail_large,
            language: stream.media_countries ? stream.media_countries[0] : null,
            category: stream.category_name,
            nsfw: !!stream.media_mature,
        };
    }

    get base() { return "https://api.smashcast.tv/"; }
    get url() { return "smashcast.tv"; }
    get name() { return "smashcast"; }
    get display_name() { return "Smashcast"; }
    get color() { return 0x208EFC; }
}

module.exports = SmashcastProcessor;
