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

class PicartoProcessor extends Processor {
    constructor(manager) {
        super(manager);

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.picarto\.tv|picarto\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,25}\b/.test(url);
    }

    async getChannel(channel, url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.picarto\.tv|picarto\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,25})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new Config(this, channel);

        let channelPage;
        try {
            channelPage = await this.request("channel/name/" + channel_name);
        } catch (err) {
            return new Config(this, channel, channel_name);
        }

        const user_id = channelPage.user_id.toString();

        const savedConfig = await this.getDBEntry(channel.guild, user_id);
        if (savedConfig) return new Config(this, channel, channel_name, user_id, savedConfig._id);

        return new Config(this, channel, channel_name, user_id);
    }

    formatURL(channel, fat = false) {
        if (fat) return this.url + "/**" + channel.name + "**";
        else return "https://" + this.url + "/" + channel.name;
    }

    async request(api) {
        const r = await fetch(this.base + api);
        return await r.json();
    }

    async checkChanges() {
        // get all online channels
        try {
            /** @type {any[]} */
            const picartoOnline = await this.request("online?adult=true");

            const stream = this.manager.getConfigs(this);

            stream.addListener("data", config => this.checkChange(picartoOnline, config));
            stream.once("end", () => { /* Do nothing */ });
            stream.once("error", err => { log(err); });
        } catch (_) { _; } // Picarto is down
    }

    /**
     * @param {any[]} picartoOnline
     * @param {Channel} savedConfig
     */
    async checkChange(picartoOnline, savedConfig) {
        const oldChannel = this.online.find(oldChannel =>
            savedConfig.userId === oldChannel.userId &&
            savedConfig.channel.guild.id === oldChannel.channel.guild.id);

        let channelPage = picartoOnline.find(channelPage => savedConfig.userId === channelPage.user_id.toString());
        if (!channelPage) {
            // remove the channel from the recently online list
            if (savedConfig.messageId || oldChannel) this.emit("offline", oldChannel || savedConfig);
        } else {
            // if the channel was not recently online, set it online
            if (oldChannel || savedConfig.messageId) return;

            try {
                channelPage = await this.request("channel/id/" + channelPage.user_id);

                const onlineChannel = new OnlineChannel(savedConfig, {
                    title: channelPage.title,
                    followers: channelPage.followers,
                    totalviews: channelPage.viewers_total,
                    avatar: channelPage.avatar,
                    nsfw: channelPage.adult,
                    category: channelPage.category,
                    tags: channelPage.tags,
                    thumbnail: channelPage.thumbnails.web_large,
                });

                this.emit("online", onlineChannel);
            } catch (_) { _; } // Picarto is down
        }
    }

    get base() { return "https://api.picarto.tv/v1/"; }
    get url() { return "picarto.tv"; }
    get name() { return "picarto"; }
    get display_name() { return "Picarto"; }
    get color() { return 0x1DA456; }
}

module.exports = PicartoProcessor;
