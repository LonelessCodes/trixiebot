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

import fetch from "node-fetch";
import { doNothing } from "../../../util/util";
import CONST from "../../../const";
import Discord from "discord.js";
import gm from "gm";

import Translation from "../../i18n/Translation";
import TranslationMerge from "../../i18n/TranslationMerge";
import TranslationEmbed from "../../i18n/TranslationEmbed";
import NumberFormat from "../../i18n/NumberFormat";

import Stream, { StreamOptions } from "./Stream";
import internal from "stream";

async function nsfwThumb(url: string): Promise<internal.Readable> {
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) throw new Error("Thumbnail could not be loaded");

    const in_stream = response.body;

    return await new Promise((res, rej) => {
        gm(in_stream, "thumb.jpg").size({ bufferStream: true }, function size(this: gm.State, err, size) {
            if (err) return rej(err);
            this.resize(420, 236)
                .blur(35, 9)
                .region(size.width, size.height, 0, 0)
                .gravity("Center")
                .fill("white")
                .fontSize(size.width / 10)
                .font("Open Sans")
                .drawText(0, 0, "N S F W")
                .quality(85)
                .stream("jpeg", (err, out_stream) => {
                    if (err) return rej(err);
                    res(out_stream);
                });
        });
    });
}

export interface OnlineStreamOptions extends StreamOptions {
    title: string;
    totalviews?: number;
    followers?: number;
    avatar?: string;
    thumbnail?: string;
    nsfw?: boolean;
    category?: string;
    game?: string;
    language?: string;
    tags?: string[];
}

export default class OnlineStream extends Stream implements OnlineStreamOptions {
    title: string;
    totalviews?: number;
    followers?: number;
    avatar?: string;
    thumbnail?: string;
    nsfw: boolean;
    category?: string;
    game?: string;
    language?: string;
    tags?: string[];

    public message: Discord.Message | null;

    constructor(stream: Stream, conf: OnlineStreamOptions);
    constructor(
        manager: import("../AlertManager").default,
        service: import("../processor/Processor").default,
        channel: Discord.TextChannel | null,
        nsfwChannel: Discord.TextChannel | null,
        sfwChannel: Discord.TextChannel | null,
        guild: Discord.Guild,
        conf: OnlineStreamOptions
    );
    constructor(
        manager: import("../AlertManager").default | Stream,
        service: import("../processor/Processor").default | OnlineStreamOptions,
        channel?: Discord.TextChannel | null,
        nsfwChannel?: Discord.TextChannel | null,
        sfwChannel?: Discord.TextChannel | null,
        guild?: Discord.Guild,
        conf?: OnlineStreamOptions
    ) {
        if (manager instanceof Stream && arguments.length === 2) {
            conf = service as OnlineStreamOptions;
            super(
                manager.manager,
                manager.service,
                manager.channel,
                manager.nsfwChannel,
                manager.sfwChannel,
                manager.guild,
                manager
            );
        } else {
            super(
                manager as import("../AlertManager").default,
                service as import("../processor/Processor").default,
                channel || null,
                nsfwChannel || null,
                sfwChannel || null,
                guild as Discord.Guild,
                conf as OnlineStreamOptions
            );
            conf = conf as OnlineStreamOptions;
        }

        this.username = conf.username || this.username;

        this.title = conf.title;
        this.totalviews = conf.totalviews;
        this.followers = conf.followers;
        this.avatar = conf.avatar;
        this.thumbnail = conf.thumbnail;
        this.nsfw = !!conf.nsfw;
        this.category = conf.category;
        this.game = conf.game;
        this.language = conf.language;
        this.tags = conf.tags;

        this.message = null;
    }

    get curr_channel() {
        return this.getChannel(this.nsfw);
    }

    setMessage(m: Discord.Message) {
        this.message = m;
        return this;
    }

    async delete() {
        if (this.messageId && !this.message) {
            const onlineMessage = await this.fetch();
            this.messageId = null;
            this.lastChannelId = null;
            if (!onlineMessage) return;
            this.message = onlineMessage;
        }

        if (this.message && this.message.deletable && !this.message.deleted) await this.message.delete().catch(doNothing);

        this.messageId = null;
        this.lastChannelId = null;
        this.message = null;
    }

    async generateEmbed() {
        if (!this.curr_channel) return;

        const footer = new TranslationMerge().separator(" | ");
        if (this.nsfw) footer.push(new Translation("alert.embed.nsfw", "NSFW"));
        if (this.category) footer.push(new TranslationMerge(new Translation("alert.embed.category", "Category:"), this.category));
        if (this.game) footer.push(new TranslationMerge(new Translation("alert.embed.game", "Game:"), this.game));
        if (this.tags && this.tags.length > 0)
            footer.push(new TranslationMerge(new Translation("alert.embed.tags", "Tags:"), this.tags.join(", ")));

        const blur = this.thumbnail ? (!this.curr_channel.nsfw ? this.nsfw : false) : false;

        let attachment: Discord.MessageAttachment | undefined;
        try {
            if (this.thumbnail) attachment = new Discord.MessageAttachment(await nsfwThumb(this.thumbnail), "thumb.jpg");
        } catch {
            /* Do nothing */
        }

        const can_use_blur = blur && attachment;
        const thumbnail = can_use_blur
            ? "attachment://thumb.jpg"
            : !blur && this.thumbnail
            ? `${this.thumbnail}?${Date.now()}`
            : null;
        const embed = new TranslationEmbed().setColor(this.service.color || CONST.COLOR.PRIMARY).setURL(this.url);

        if (await this.manager.isCompact(this.guild)) {
            embed.setAuthor(this.username, this.avatar, this.url);
            if (thumbnail) {
                if (can_use_blur) embed.attachFiles([thumbnail]);
                embed.setImage(thumbnail);
            }
            embed.setFooter(footer);

            return embed;
        }

        embed.setAuthor(this.username).setTitle(this.title);
        if (this.avatar) embed.setThumbnail(this.avatar);
        if (this.followers != undefined)
            embed.addField(new Translation("alert.embed.followers", "Followers"), new NumberFormat(this.followers), true);
        if (this.totalviews != undefined)
            embed.addField(new Translation("alert.embed.viewers", "Total Viewers"), new NumberFormat(this.totalviews), true);
        if (thumbnail) {
            if (can_use_blur) embed.attachFiles([thumbnail]);
            embed.setImage(thumbnail);
        }
        embed.setFooter(footer);

        return embed;
    }
}
