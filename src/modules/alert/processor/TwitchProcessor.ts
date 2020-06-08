/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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
import config from "../../../config";

import Processor from "./Processor";
import ParsedStream from "../stream/ParsedStream";
import OnlineStream, { OnlineStreamOptions } from "../stream/OnlineStream";
import Stream from "../stream/Stream";

import TwitchClient, { Stream as TwitchStream } from "twitch";
import { doNothing } from "../../../util/util";

class TwitchProcessor extends Processor {
    twitch = TwitchClient.withClientCredentials(config.get("twitch.client_id"), config.get("twitch.client_secret"));

    constructor(manager: import("../AlertManager").default) {
        super(manager);

        setInterval(() => this._checkChanges().catch(doNothing), 60 * 1000);
        this._checkChanges().catch(doNothing);
    }

    testURL(url: string): boolean {
        return /^(http:\/\/|https:\/\/)?(www\.twitch\.tv|twitch\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async parseStreamer(url: string): Promise<ParsedStream> {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.twitch\.tv|twitch\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new ParsedStream(this);

        const user = await this.twitch.helix.users.getUserByName(channel_name);
        if (!user) return new ParsedStream(this, channel_name);

        const user_id = user.id;
        const username = user.displayName;

        return new ParsedStream(this, username, user_id);
    }

    formatURL(stream: ParsedStream, fat = false): string {
        if (fat) return this.url + "/**" + stream.username + "**";
        return "https://" + this.url + "/" + stream.username;
    }

    // PRIVATE

    private async _checkChanges() {
        const streams = await this.manager.getConfigsStream({ service: this.name }).toArray();
        if (streams.length === 0) return;

        const users = Array.from(new Set(streams.map(s => s.userId)));

        for (let i = 0; i < users.length; i += 10) {
            const part = users.slice(i, 10 + i);

            const online_streams = await this.twitch.kraken.streams.getStreams(part);

            for (const config of streams.filter(s => part.includes(s.userId)))
                await this._checkChange(online_streams, config).catch(log.error);
        }
    }

    private async _checkChange(online_streams: TwitchStream[], savedConfig: Stream) {
        const oldStream = this.online.find(
            oldStream => savedConfig.userId === oldStream.userId && savedConfig.guild.id === oldStream.guild.id
        );

        const streamPage = online_streams.find(streamPage => savedConfig.userId === streamPage.channel.id);
        if (!streamPage) {
            if (!savedConfig.messageId && !oldStream) return;
            // remove the channel from the recently online list
            this.emit("offline", oldStream || savedConfig);
            return;
        }

        const newStreamChannel = savedConfig.getChannel(streamPage.channel.isMature);

        // channel changed adult state
        if (oldStream && oldStream.curr_channel) {
            if (!newStreamChannel) return this.emit("offline", oldStream);
            if (!oldStream.curr_channel.equals(newStreamChannel)) {
                this.emit("change", new OnlineStream(savedConfig, this.serializeRaw(streamPage)));
                return;
            }
        }

        // channel changed and last message still posted
        if (!oldStream && savedConfig.lastChannel && (!newStreamChannel || !savedConfig.lastChannel.equals(newStreamChannel)))
            await savedConfig.delete();

        // if the channel was not recently online, set it online
        if (oldStream || savedConfig.messageId) return;
        if (!newStreamChannel) return;

        this.emit("online", new OnlineStream(savedConfig, this.serializeRaw(streamPage)));
    }

    serializeRaw(streamPage: TwitchStream): OnlineStreamOptions {
        return {
            username: streamPage.channel.displayName,
            userId: streamPage.channel.id,
            title: streamPage.channel.status,
            followers: streamPage.channel.followers,
            totalviews: streamPage.channel.views,
            avatar: streamPage.channel.logo,
            game: streamPage.game,
            thumbnail: streamPage.getPreviewUrl("large"),
            language: streamPage.channel.language,
            nsfw: streamPage.channel.isMature,
        };
    }

    readonly url = "twitch.tv";
    readonly name = "twitch";
    readonly display_name = "Twitch";
    readonly color = 0x6441a4;
}

export default TwitchProcessor;
