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

const log = require("../../../log").default.namespace("alert cmd");
const config = require("../../../config").default;

const Processor = require("./Processor");
const ParsedStream = require("../stream/ParsedStream").default;
const OnlineStream = require("../stream/OnlineStream");
// eslint-disable-next-line no-unused-vars
const Stream = require("../stream/Stream").default;

const TwitchClient = require("twitch").default;

class TwitchProcessor extends Processor {
    constructor(manager) {
        super(manager);

        this.twitch = TwitchClient.withCredentials(config.get("twitch.client_id"));

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.twitch\.tv|twitch\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async parseStreamer(url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.twitch\.tv|twitch\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new ParsedStream(this);

        const user = await this.twitch.helix.users.getUserByName(channel_name);
        if (!user) return new ParsedStream(this, channel_name);

        const user_id = user.id;
        const username = user.displayName;

        return new ParsedStream(this, username, user_id);
    }

    formatURL(stream, fat = false) {
        if (fat) return this.url + "/**" + stream.username + "**";
        else return "https://" + this.url + "/" + stream.username;
    }

    async checkChanges() {
        const streams = await this.manager.getServiceConfigsStream(this).toArray();
        if (streams.length === 0) return;

        const set = new Set(streams.map(c => c.userId));

        const online_streams = await this.twitch.kraken.streams.getStreams(Array.from(set));

        for (let config of streams) await this.checkChange(config, online_streams).catch(err => log.error(err));
    }

    /**
     * @param {Stream} savedConfig
     * @param {any[]} online_streams
     */
    async checkChange(savedConfig, online_streams) {
        const oldStream = this.online.find(oldStream =>
            savedConfig.userId === oldStream.userId &&
            savedConfig.guild.id === oldStream.guild.id);

        const streamPage = online_streams.find(streamPage => savedConfig.userId === streamPage.channel.id.toString());
        if (!streamPage) {
            if (!savedConfig.messageId && !oldStream) return;
            // remove the channel from the recently online list
            this.emit("offline", oldStream || savedConfig);
        } else if (oldStream && !oldStream.curr_channel.equals(savedConfig.getChannel(streamPage.channel.isMature))) { // channel changed adult state and
            if (!savedConfig.getSendable(streamPage.channel.isMature)) this.emit("offline", oldStream);

            this.emit("change", new OnlineStream(savedConfig, this.serializeRaw(streamPage)));
        } else {
            // channel changed and last message still posted
            if (!oldStream && savedConfig.lastChannelId && !savedConfig.lastChannel.equals(savedConfig.getChannel(streamPage.channel.isMature)))
                await savedConfig.delete();

            // if the channel was not recently online, set it online
            if (oldStream || savedConfig.messageId) return;
            if (!savedConfig.getSendable(streamPage.channel.isMature)) return;

            this.emit("online", new OnlineStream(savedConfig, this.serializeRaw(streamPage)));
        }
    }

    serializeRaw(streamPage) {
        return {
            username: streamPage.channel.name,
            title: streamPage.channel.status,
            followers: streamPage.channel.followers,
            totalviews: streamPage.channel.views,
            avatar: streamPage.channel.logo,
            game: streamPage.game,
            thumbnail: streamPage._data.preview.large,
            language: streamPage.channel.language,
            nsfw: streamPage.channel.isMature,
        };
    }

    get url() { return "twitch.tv"; }
    get name() { return "twitch"; }
    get display_name() { return "Twitch"; }
    get color() { return 0x6441A4; }
}

module.exports = TwitchProcessor;
