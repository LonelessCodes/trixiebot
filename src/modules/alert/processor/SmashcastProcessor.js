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
const log = require("../../../log").namespace("alert cmd");

const Processor = require("./Processor");
const Config = require("../Config");
const OnlineChannel = require("../OnlineChannel");

class SmashcastProcessor extends Processor {
    constructor(manager) {
        super(manager);

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.smashcast\.tv|smashcast\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async request(api) {
        const r = await fetch(this.base + api);
        const json = await r.json();
        if (json.error == true) throw new Error(json.error_msg);
        return json;
    }

    async getChannel(channel, url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.smashcast\.tv|smashcast\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new Config(this, channel);

        let channelPage;
        try {
            channelPage = await this.request("user/" + channel_name);
            if (channelPage.user_name === null) throw new Error("User does not exist");

            const user_id = channelPage.user_id;
            const name = channelPage.user_name;

            const savedConfig = await this.getDBEntry(channel.guild, user_id);
            if (savedConfig) return new Config(this, channel, name, user_id, savedConfig._id);

            return new Config(this, channel, name, user_id);
        } catch (err) {
            return new Config(this, channel, channel_name);
        }
    }

    formatURL(channel, fat = false) {
        if (fat) return this.url + "/**" + channel.name + "**";
        else return "https://" + this.url + "/" + channel.name;
    }

    async checkChanges() {
        const channels = await this.manager.getConfigs(this).toArray();
        if (channels.length === 0) return;

        const set = new Set(channels.map(c => c.name));

        try {
            const online_channels = await this.request("media/live/" + Array.from(set).join(","));

            const online = online_channels.livestream.filter(stream => stream.media_is_live !== "0");

            for (let config of channels) await this.checkChange(config, online).catch(err => log.error(err));
        } catch (_) { _; } // Smashcast is down
    }

    async checkChange(config, online_channels) {
        const oldChannel = this.online.find(oldChannel =>
            config.userId === oldChannel.userId &&
            config.channel.guild.id === oldChannel.channel.guild.id);

        const stream = online_channels.find(stream => config.userId === stream.media_user_id);
        if (!stream) {
            // remove the channel from the recently online list
            if (config.messageId || oldChannel) this.emit("offline", oldChannel || config);
        } else {
            // if the channel was not recently online, set it online
            if (oldChannel || config.messageId) return;

            const views = await this.request("media/views/" + config.name);
            const media_base = "https://edge.sf.hitbox.tv";

            const onlineChannel = new OnlineChannel(config, {
                totalviews: views.total_live_views ? parseInt(views.total_live_views) : 0,
                title: stream.media_status || stream.media_title,
                avatar: media_base + stream.channel.user_logo,
                followers: parseInt(stream.channel.followers),
                thumbnail: media_base + stream.media_thumbnail_large,
                language: stream.media_countries ? stream.media_countries[0] : null,
                category: stream.category_name,
                nsfw: !!stream.media_mature,
            });

            this.emit("online", onlineChannel);
        }
    }

    get base() { return "https://api.smashcast.tv/"; }
    get url() { return "smashcast.tv"; }
    get name() { return "smashcast"; }
    get display_name() { return "Smashcast"; }
    get color() { return 0x208EFC; }
}

module.exports = SmashcastProcessor;
