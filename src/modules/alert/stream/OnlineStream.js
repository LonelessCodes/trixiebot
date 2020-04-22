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
const CONST = require("../../../const").default;
const Discord = require("discord.js");
const gm = require("gm");

const Translation = require("../../i18n/Translation").default;
const TranslationMerge = require("../../i18n/TranslationMerge").default;
const TranslationEmbed = require("../../i18n/TranslationEmbed").default;
const NumberFormat = require("../../i18n/NumberFormat").default;

const Stream = require("./Stream");

async function nsfwThumb(url) {
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) throw new Error("Thumbnail could not be loaded");

    const in_stream = response.body;

    return await new Promise((res, rej) => {
        gm(in_stream, "thumb.jpg")
            .size({ bufferStream: true }, function size(err, size) {
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

class OnlineStream extends Stream {
    constructor(manager, service, channel, nsfwChannel, sfwChannel, conf = {}) {
        if (manager instanceof Stream && arguments.length === 2) {
            conf = service;
            super(manager.manager, manager.service, manager.channel, manager.nsfwChannel, manager.sfwChannel, manager);
        } else {
            super(manager, service, channel, nsfwChannel, sfwChannel, conf);
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

    get sendable() {
        return this.getSendable(this.nsfw);
    }

    setMessage(m) {
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

        if (this.message && this.message.deletable && !this.message.deleted)
            await this.message.delete().catch(() => { /* Do nothing */ });

        this.messageId = null;
        this.lastChannelId = null;
        this.message = null;
    }

    async getEmbed() {
        if (!this.sendable) return;

        const footer = new TranslationMerge().separator(" | ");
        if (this.nsfw) footer.push(new Translation("alert.embed.nsfw", "NSFW"));
        if (this.category) footer.push(new TranslationMerge(new Translation("alert.embed.category", "Category:"), this.category));
        if (this.game) footer.push(new TranslationMerge(new Translation("alert.embed.game", "Game:"), this.game));
        if (this.tags && this.tags.length > 0) footer.push(new TranslationMerge(new Translation("alert.embed.tags", "Tags:"), this.tags.join(", ")));

        const blur = this.thumbnail ?
            !this.curr_channel.nsfw ?
                this.nsfw :
                false :
            false;
        /** @type {Discord.MessageAttachment} */

        let attachment;
        try {
            attachment = new Discord.MessageAttachment(await nsfwThumb(this.thumbnail), "thumb.jpg");
        } catch (_) { /* Do nothing */ }

        const can_use_blur = blur && attachment;
        const thumbnail = can_use_blur ?
            "attachment://thumb.jpg" :
            !blur && this.thumbnail ?
                `${this.thumbnail}?${Date.now()}` :
                null;
        const embed = new TranslationEmbed()
            .setColor(this.service.color || CONST.COLOR.PRIMARY)
            .setURL(this.url);

        if (await this.manager.isCompact(this.guild)) {
            embed.setAuthor(this.username, this.avatar, this.url);
            if (thumbnail) {
                if (can_use_blur) embed.attachFiles(attachment);
                embed.setImage(thumbnail);
            }
            embed.setFooter(footer);

            return embed;
        } else {
            embed.setAuthor(this.username)
                .setTitle(this.title)
                .setThumbnail(this.avatar);
            if (this.followers != null) embed.addField(new Translation("alert.embed.followers", "Followers"), new NumberFormat(this.followers), true);
            if (this.totalviews != null) embed.addField(new Translation("alert.embed.viewers", "Total Viewers"), new NumberFormat(this.totalviews), true);
            if (thumbnail) {
                if (can_use_blur) embed.attachFiles(attachment);
                embed.setImage(thumbnail);
            }
            embed.setFooter(footer);

            return embed;
        }
    }
}

module.exports = OnlineStream;
