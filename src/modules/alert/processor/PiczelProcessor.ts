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
import { doNothing } from "../../../util/util";
import fetch from "node-fetch";

import Processor from "./Processor";
import ParsedStream from "../stream/ParsedStream";
import OnlineStream, { OnlineStreamOptions } from "../stream/OnlineStream";
import Stream from "../stream/Stream";

interface PiczelOnlineResponse {
    id: number;
    title: string;
    description: string;
    rendered_description: string;
    follower_count: number;
    live: boolean;
    live_since: string;
    "isPrivate?": boolean;
    offline_image: { url: string | null };
    banner: { banner: { url: string | null } };
    banner_link: string | null;
    preview: { url: string | null };
    adult: boolean;
    in_multi: boolean;
    parent_streamer: string;
    settings: {
        basic: {
            listed: boolean;
            allowAnon: boolean;
            notifications: boolean;
        };
        recording: {
            enabled: boolean;
            download: boolean;
            timelapse_speed: number;
            watermark_timelapse: boolean;
            gen_timelapse: boolean;
        };
        private: {
            enabled: boolean;
            moderated: boolean;
        };
        emails: {
            enabled: boolean;
        };
    };
    viewers: number;
    username: string;
    slug: string;
    tags: {
        title: string;
        count: number;
    }[];
    user: {
        id: number;
        username: string;
        "premium?": boolean;
        avatar: { url: string | null };
        role: string;
        gallery: {
            profile_description: string;
        };
        follower_count: number;
    };
    recordings: unknown[];
}

interface PiczelChannelResponse {
    type: "stream" | "multi";
    data: PiczelOnlineResponse[];
    meta: { limit_reached: boolean; host_id?: number; host_name?: string };
    error: any;
}

class PiczelProcessor extends Processor {
    constructor(manager: import("../AlertManager").default) {
        super(manager);

        setInterval(() => this._checkChanges().catch(doNothing), 60 * 1000);
        this._checkChanges().catch(doNothing);
    }

    testURL(url: string) {
        return /^(http:\/\/|https:\/\/)?(www\.piczel\.tv|piczel\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async parseStreamer(url: string): Promise<ParsedStream> {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.piczel\.tv|piczel\.tv)\/watch\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new ParsedStream(this);

        try {
            const response: PiczelChannelResponse = await this._request("streams/" + channel_name);
            if (response.error || !response.data[0] || !response.data[0].user) return new ParsedStream(this, channel_name);

            const channelPage = response.data[0];

            const user_id = String(channelPage.user.id);
            const username = channelPage.user.username;

            return new ParsedStream(this, username, user_id);
        } catch (err) {
            return new ParsedStream(this, channel_name);
        }
    }

    formatURL(stream: ParsedStream, fat = false) {
        if (fat) return this.url + "/watch/**" + stream.username + "**";
        return "https://" + this.url + "/watch/" + stream.username;
    }

    // All private methods

    private async _request(api: string) {
        const r = await fetch(this.base + api);
        return await r.json();
    }

    private async _checkChanges() {
        const piczelOnline: PiczelOnlineResponse[] = await this._request("streams/?nsfw=true&live_only=false");
        if (!Array.isArray(piczelOnline)) return log.error("Piczel error:", piczelOnline);

        const db_stream = this.manager.getServiceConfigsStream(this);
        db_stream.on("data", (config: Stream) => this._checkChange(piczelOnline, config));
        db_stream.once("error", log.error);
    }

    private async _checkChange(piczelOnline: PiczelOnlineResponse[], newStream: Stream) {
        const oldStream = this.online.find(
            oldstream => newStream.userId === oldstream.userId && newStream.guild.id === oldstream.guild.id
        );

        const streamPage = piczelOnline.find(streamPage => newStream.userId === String(streamPage.user.id));
        if (!streamPage) {
            if (!newStream.messageId && !oldStream) return;
            // remove the channel from the recently online list
            this.emit("offline", oldStream || newStream);
            return;
        }

        const newStreamChannel = newStream.getChannel(streamPage.adult);

        // channel changed adult state
        if (oldStream && oldStream.curr_channel) {
            if (!newStreamChannel) return this.emit("offline", oldStream);
            if (!oldStream.curr_channel.equals(newStreamChannel)) {
                this.emit("change", new OnlineStream(oldStream, this.serializeRaw(streamPage)));
                return;
            }
        }

        // channel changed and last message still posted
        if (!oldStream && newStream.lastChannel && (!newStreamChannel || !newStream.lastChannel.equals(newStreamChannel)))
            await newStream.delete();

        // if the channel was not recently online, set it online
        if (oldStream || newStream.messageId) return;
        if (!newStreamChannel) return;

        this.emit("online", new OnlineStream(newStream, this.serializeRaw(streamPage)));
    }

    private serializeRaw(raw: PiczelOnlineResponse): OnlineStreamOptions {
        return {
            username: raw.user.username,
            userId: String(raw.user.id),
            title: raw.title,
            followers: raw.follower_count,
            avatar: raw.user.avatar ? raw.user.avatar.url || undefined : undefined,
            nsfw: raw.adult,
            tags: raw.tags.map(tag => tag.title),
            thumbnail: `https://piczel.tv/static/screenshots/stream_${raw.id}.jpg`,
        };
    }

    readonly base = "https://piczel.tv/api/";
    readonly url = "piczel.tv";
    readonly name = "piczel";
    readonly display_name = "Piczel.tv";
    readonly color = 0;
}

export default PiczelProcessor;
