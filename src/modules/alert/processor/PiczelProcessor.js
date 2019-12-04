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

class PiczelProcessor extends Processor {
    constructor(manager) {
        super(manager);

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.piczel\.tv|piczel\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async getChannel(channel, url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.piczel\.tv|piczel\.tv)\/watch\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new Config(this, channel);

        try {
            let channelPage = await this.request("streams/" + channel_name);
            if (channelPage.error || !channelPage.data[0] || !channelPage.data[0].user) return new Config(this, channel, channel_name);

            channelPage = channelPage.data[0];

            const user_id = channelPage.user.id.toString();
            const name = channelPage.user.username;

            const savedConfig = await this.getDBEntry(channel.guild, user_id);
            if (savedConfig) return new Config(this, channel, name, user_id, savedConfig._id);

            return new Config(this, channel, name, user_id);
        } catch (err) {
            return new Config(this, channel, channel_name);
        }
    }

    formatURL(channel, fat = false) {
        if (fat) return this.url + "/watch/**" + channel.name + "**";
        else return "https://" + this.url + "/watch/" + channel.name;
    }

    async request(api) {
        const r = await fetch(this.base + api);
        return await r.json();
    }

    async checkChanges() {
        // get all online channels
        try {
            const piczelOnline = await this.request("streams/?nsfw=true&live_only=false");
            if (piczelOnline.error) throw new Error("Piczel error:", piczelOnline.error);

            const stream = this.manager.getConfigs(this);

            stream.addListener("data", config => this.checkChange(piczelOnline, config));
            stream.once("end", () => { /* Do nothing */ });
            stream.once("error", err => { log(err); });
        } catch (_) { _; } // Piczel is down
    }

    /**
     * @param {any} piczelOnline
     * @param {Channel} savedConfig
     */
    checkChange(piczelOnline, savedConfig) {
        const oldChannel = this.online.find(oldChannel =>
            savedConfig.userId === oldChannel.userId &&
            savedConfig.channel.guild.id === oldChannel.channel.guild.id);

        const channelPage = piczelOnline.find(channelPage => savedConfig.userId === channelPage.user.id.toString());
        if (!channelPage) {
            // remove the channel from the recently online list
            if (savedConfig.messageId || oldChannel) this.emit("offline", oldChannel || savedConfig);
        } else {
            // if the channel was not recently online, set it online
            if (oldChannel || savedConfig.messageId) return;

            const onlineChannel = new OnlineChannel(savedConfig, {
                title: channelPage.title,
                followers: channelPage.follower_count,
                avatar: channelPage.user.avatar ? channelPage.user.avatar.avatar.url : null,
                nsfw: channelPage.adult,
                tags: channelPage.tags,
                thumbnail: `https://piczel.tv/static/thumbnail/stream_${channelPage.id}.jpg`,
            });

            this.emit("online", onlineChannel);
        }
    }

    get base() { return "https://piczel.tv/api/"; }
    get url() { return "piczel.tv"; }
    get name() { return "piczel"; }
    get display_name() { return "Piczel.tv"; }
}

module.exports = PiczelProcessor;
