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

interface SmashcastResponse {
    error: boolean;
}

interface SmashcastChannelResponse extends SmashcastResponse {
    user_name: string | null;
    user_cover: string | null; // URL
    user_status: string | null;
    user_logo: string | null; // URL
    user_logo_small: string | null; // URL
    user_is_broadcaster: boolean | null;
    followers: string | null;
    user_partner: string | null;
    user_id: string | null;
    is_live: string | null;
    live_since: string | null;
    twitter_account: string | null;
    twitter_enabled: string | null;
    user_beta_profile: string | null;
}

interface SmashcastOnlineChannel {
    media_user_name: string;
    media_id: string;
    media_file: string;
    media_user_id: string;
    media_profiles: null;
    media_type_id: "1";
    media_is_live: "0";
    media_live_delay: "0";
    media_date_added: "2014-09-08 21:51:18";
    media_live_since: "2015-02-07 17:25:45";
    media_transcoding: null;
    media_chat_enabled: "1";
    media_countries: [string];
    media_hosted_id: null;
    media_mature: null;
    media_hidden: null;
    media_offline_id: null;
    user_banned: null;
    partner_type: null;
    media_name: string;
    media_display_name: string;
    media_status: "Osu! - 60k Tablet - Casual Stream";
    media_title: string;
    media_description: string;
    media_description_md: "\n";
    media_tags: string;
    media_duration: "0.0000";
    media_bg_image: null;
    media_views: "0";
    media_views_daily: "0";
    media_views_weekly: "0";
    media_views_monthly: "0";
    media_chat_channel: null;
    category_id: string;
    category_name: "Osu!";
    category_name_short: null;
    category_seo_key: string;
    category_viewers: "0";
    category_media_count: "1";
    category_channels: null;
    category_logo_small: "/static/img/games/cover_osu_58249a4f7d41c.jpg";
    category_logo_large: "/static/img/games/cover_osu_5813910320a69.jpg";
    category_updated: "2020-04-15 19:19:01";
    team_name: null;
    media_start_in_sec: "0";
    media_is_spherical: false;
    following: false;
    subscribed: false;
    media_thumbnail: "/static/img/media/live/api_mid_000.jpg";
    media_thumbnail_large: "/static/img/media/live/api_large_000.jpg";
    channel: {
        followers: "3";
        videos: "1";
        recordings: "0";
        teams: "0";
        user_id: "730208";
        user_name: "API";
        user_status: "1";
        user_logo: "/static/img/generic/default-user-200.png";
        user_cover: null;
        user_logo_small: "/static/img/generic/default-user-50.png";
        user_partner: null;
        partner_type: null;
        user_beta_profile: "0";
        media_is_live: "0";
        media_live_since: "2015-02-07 17:25:45";
        user_media_id: "252325";
        twitter_account: null;
        twitter_enabled: null;
        livestream_count: "1";
        channel_link: "https://smashcast.tv/api";
    };
}

interface SmashcastOnlineResponse {
    request: {
        this: string;
    };
    media_type: "live";
    livestream: SmashcastOnlineChannel[];
}

class SmashcastProcessor extends Processor {
    constructor(manager: import("../AlertManager").default) {
        super(manager);

        setInterval(() => this._checkChanges().catch(doNothing), 60 * 1000);
        this._checkChanges().catch(doNothing);
    }

    testURL(url: string) {
        return /^(http:\/\/|https:\/\/)?(www\.smashcast\.tv|smashcast\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async parseStreamer(url: string): Promise<ParsedStream> {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.smashcast\.tv|smashcast\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new ParsedStream(this);

        try {
            const streamPage: SmashcastChannelResponse = await this._request("user/" + channel_name);
            if (!streamPage.user_name || !streamPage.user_id || streamPage.error) return new ParsedStream(this, channel_name);

            const user_id = streamPage.user_id;
            const username = streamPage.user_name;

            return new ParsedStream(this, username, user_id);
        } catch (err) {
            return new ParsedStream(this, channel_name);
        }
    }

    formatURL(stream: ParsedStream, fat = false) {
        if (fat) return this.url + "/**" + stream.username + "**";
        return "https://" + this.url + "/" + stream.username;
    }

    // PRIVATE

    private async _request(api: string) {
        const r = await fetch(this.base + api);
        const json = await r.json();
        if (json.error) throw new Error(json.error_msg);
        return json;
    }

    private async _checkChanges() {
        const streams = await this.manager.getServiceConfigsStream(this).toArray();
        if (streams.length === 0) return;

        const users = Array.from(new Set(streams.map(s => s.username)));

        for (let i = 0; i < users.length; i += 10) {
            const part = users.slice(i, 10 + i);
            const online_channels: SmashcastOnlineResponse = await this._request("media/live/" + part.join(","));

            const online: SmashcastOnlineChannel[] = online_channels.livestream.filter(stream => stream.media_is_live !== "0");

            for (const config of streams.filter(s => part.includes(s.username)))
                await this._checkChange(online, config).catch(err => log.error(err));
        }
    }

    private async _checkChange(online_streams: SmashcastOnlineChannel[], newStream: Stream) {
        const oldStream = this.online.find(
            oldStream => newStream.userId === oldStream.userId && newStream.guild.id === oldStream.guild.id
        );

        const streamPage = online_streams.find(stream => newStream.userId === stream.media_user_id);
        if (!streamPage) {
            if (!newStream.messageId && !oldStream) return;
            // remove the channel from the recently online list
            this.emit("offline", oldStream || newStream);
            return;
        }

        const newStreamChannel = newStream.getChannel(!!streamPage.media_mature);

        // channel changed adult state
        if (oldStream && oldStream.curr_channel) {
            if (!newStreamChannel) return this.emit("offline", oldStream);
            if (!oldStream.curr_channel.equals(newStreamChannel)) {
                this.emit("change", new OnlineStream(newStream, await this._serializeRaw(streamPage)));
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

    private async _serializeRaw(stream: SmashcastOnlineChannel): Promise<OnlineStreamOptions> {
        const views = await this._request("media/views/" + stream.channel.user_name);
        const media_base = "https://edge.sf.hitbox.tv";

        return {
            username: stream.media_user_name,
            userId: stream.media_user_id,
            totalviews: views.total_live_views ? parseInt(views.total_live_views) : 0,
            title: stream.media_status || stream.media_title,
            avatar: media_base + stream.channel.user_logo,
            followers: parseInt(stream.channel.followers),
            thumbnail: media_base + stream.media_thumbnail_large,
            language: stream.media_countries ? stream.media_countries[0] : undefined,
            category: stream.category_name,
            nsfw: !!stream.media_mature,
        };
    }

    readonly base = "https://api.smashcast.tv/";
    readonly url = "smashcast.tv";
    readonly name = "smashcast";
    readonly display_name = "Smashcast";
    readonly color = 0x208efc;
}

export default SmashcastProcessor;
