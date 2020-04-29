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

interface PicartoOnlineResponse {
    user_id: number;
    name: string;
    title: string;
    viewers: number;
    thumbnails: {
        web: string;
        web_large: string;
        mobile: string;
        tablet: string;
    };
    category: string;
    account_type: string;
    adult: boolean;
    gaming: boolean;
    commissions: boolean;
    multistream: boolean;
    languages: { id: number; name: string }[];
}

interface PicartoChannelResponse {
    user_id: number;
    name: string;
    title: string;
    viewers: number;
    thumbnails: {
        web: string;
        web_large: string;
        mobile: string;
        tablet: string;
    };
    category: string;
    account_type: string;
    adult: boolean;
    gaming: boolean;
    commissions: boolean;
    languages: { id: number; name: string }[];

    avatar: string;
    online: boolean;
    viewers_total: number;
    followers: number;
    subscribers: number;
    recordings: boolean;
    description_panels: {
        title: string;
        body: string;
        image: string;
        image_link: string;
        button_text: string;
        button_link: string;
        position: number;
    }[];
    private: boolean;
    private_message: string;
    chat_settings: { guest_chat: boolean; links: boolean; level: number };
    last_live: string; // ISO timestamp
    tags: string[];
    multistream: { user_id: number; name: string; online: boolean; adult: boolean }[];
    following: boolean;
}

class PicartoProcessor extends Processor {
    constructor(manager: import("../AlertManager").default) {
        super(manager);

        setInterval(() => this._checkChanges().catch(doNothing), 60 * 1000);
        this._checkChanges().catch(doNothing);
    }

    testURL(url: string) {
        return /^(http:\/\/|https:\/\/)?(www\.picarto\.tv|picarto\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,25}\b/.test(url);
    }

    async parseStreamer(url: string): Promise<ParsedStream> {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.picarto\.tv|picarto\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,25})\b/;

        const [, username] = regexp.exec(url) || [];

        if (!username) return new ParsedStream(this);

        try {
            const streamPage: PicartoChannelResponse = await this._request("channel/name/" + username);

            const userid = String(streamPage.user_id);
            return new ParsedStream(this, username, userid);
        } catch {
            return new ParsedStream(this, username);
        }
    }

    formatURL(stream: ParsedStream, fat = false) {
        if (fat) return this.url + "/**" + stream.username + "**";
        return "https://" + this.url + "/" + stream.username;
    }

    // All private methods

    private async _request(api: string) {
        return await fetch(this.base + api).then(r => r.json());
    }

    private async _checkChanges() {
        const picartoOnline: PicartoOnlineResponse[] = await this._request("online?adult=true&gaming=true");

        const db_stream = this.manager.getServiceConfigsStream(this);
        db_stream.on("data", (config: Stream) => this._checkChange(picartoOnline, config));
        db_stream.once("error", log.error);
    }

    private async _checkChange(picartoOnline: PicartoOnlineResponse[], newStream: Stream) {
        const oldStream = this.online.find(
            oldStream => newStream.userId === oldStream.userId && newStream.guild.id === oldStream.guild.id
        );

        const streamPage = picartoOnline.find(streamPage => newStream.userId === String(streamPage.user_id));
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
                this.emit("change", new OnlineStream(oldStream, await this._serializeRaw(streamPage)));
                return;
            }
        }

        // channel changed and last message still posted
        if (!oldStream && newStream.lastChannel && (!newStreamChannel || !newStream.lastChannel.equals(newStreamChannel)))
            await newStream.delete();

        // if the channel was not recently online, set it online
        if (oldStream || newStream.messageId) return;
        if (!newStreamChannel) return;

        this.emit("online", new OnlineStream(newStream, await this._serializeRaw(streamPage)));
    }

    private async _serializeRaw(raw: PicartoOnlineResponse | PicartoChannelResponse): Promise<OnlineStreamOptions> {
        const channel: PicartoChannelResponse = await this._request("channel/id/" + raw.user_id);

        return {
            username: channel.name,
            userId: String(channel.user_id),
            title: channel.title,
            followers: channel.followers,
            totalviews: channel.viewers_total,
            avatar: channel.avatar,
            nsfw: channel.adult,
            category: channel.category,
            tags: channel.tags,
            thumbnail: channel.thumbnails.web_large,
        };
    }

    readonly base = "https://api.picarto.tv/v1/";
    readonly url = "picarto.tv";
    readonly name = "picarto";
    readonly display_name = "Picarto";
    readonly color = 0x1da456;
}

export default PicartoProcessor;
