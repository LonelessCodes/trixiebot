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

const log = require("../../../log").namespace("alert cmd");
const config = require("../../../config");

const Processor = require("./Processor");
const Config = require("../Config");
const OnlineChannel = require("../OnlineChannel");

const TwitchClient = require("twitch").default;

class TwitchProcessor extends Processor {
    constructor(manager) {
        super(manager);

        return new Promise(async resolve => {
            this.twitch = await TwitchClient.withCredentials(config.get("twitch.client_id"));

            setInterval(() => this.checkChanges(), 60 * 1000);
            this.checkChanges();

            resolve(this);
        });
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.twitch\.tv|twitch\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async getChannel(channel, url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.twitch\.tv|twitch\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new Config(this, channel);

        const user = await this.twitch.helix.users.getUserByName(channel_name);
        if (!user) return new Config(this, channel, channel_name);

        const user_id = user.id;
        const name = user.displayName;

        const savedConfig = await this.getDBEntry(channel.guild, user_id);
        if (savedConfig) return new Config(this, channel, name, user_id, savedConfig._id);

        return new Config(this, channel, name, user_id);
    }

    formatURL(channel, fat = false) {
        if (fat) return this.url + "/**" + channel.name + "**";
        else return "https://" + this.url + "/" + channel.name;
    }

    async checkChanges() {
        const channels = await this.manager.getConfigs(this).toArray();
        if (channels.length === 0) return;

        const set = new Set(channels.map(c => c.userId));

        const online_channels = await this.twitch.kraken.streams.getStreams(Array.from(set));

        for (let config of channels) await this.checkChange(config, online_channels).catch(err => log.error(err));
    }

    async checkChange(config, online_channels) {
        const oldChannel = this.online.find(oldChannel =>
            config.userId === oldChannel.userId &&
            config.channel.guild.id === oldChannel.channel.guild.id);

        const channelPage = online_channels.find(channelPage => config.userId === channelPage.channel.id.toString());
        if (!channelPage) {
            // remove the channel from the recently online list
            if (config.messageId || oldChannel) this.emit("offline", oldChannel || config);
        } else {
            // if the channel was not recently online, set it online
            if (oldChannel || config.messageId) return;

            const stream = await this.twitch.helix.streams.getStreamByUserId(config.userId);
            if (!stream) return;

            const onlineChannel = new OnlineChannel(config, {
                title: stream.title,
                followers: channelPage.channel.followers,
                totalviews: channelPage.channel.views,
                avatar: channelPage.channel.logo,
                game: channelPage.game,
                thumbnail: channelPage.getPreviewUrl("large"),
                language: stream.language,
                nsfw: channelPage.channel.isMature,
            });

            this.emit("online", onlineChannel);
        }
    }

    get url() { return "twitch.tv"; }
    get name() { return "twitch"; }
    get display_name() { return "Twitch"; }
    get color() { return 0x6441A4; }
}

module.exports = TwitchProcessor;
