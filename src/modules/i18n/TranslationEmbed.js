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

const { MessageAttachment, MessageEmbed, Util } = require("discord.js");
const Resolvable = require("./Resolvable");

// TODO: extend MessageEmbed and implement Interface Resolvable

/**
 * A rich embed to be sent with a message with a fluent interface for creation.
 * @param {Object} [data] Data to set in the rich embed
 */
class TranslationEmbed extends Resolvable {
    constructor(data = {}) {
        super();

        /**
         * Title for this Embed
         * @type {string}
         */
        this.title = data.title;

        /**
         * Description for this Embed
         * @type {string}
         */
        this.description = data.description;

        /**
         * URL for this Embed
         * @type {string}
         */
        this.url = data.url;

        /**
         * Color for this Embed
         * @type {number}
         */
        this.color = data.color;

        /**
         * Author for this Embed
         * @type {Object}
         */
        this.author = data.author;

        /**
         * Timestamp for this Embed
         * @type {Date}
         */
        this.timestamp = data.timestamp;

        /**
         * Fields for this Embed
         * @type {Object[]}
         */
        this.fields = data.fields || [];

        /**
         * Thumbnail for this Embed
         * @type {Object}
         */
        this.thumbnail = data.thumbnail;

        /**
         * Image for this Embed
         * @type {Object}
         */
        this.image = data.image;

        /**
         * Footer for this Embed
         * @type {Object}
         */
        this.footer = data.footer;

        /**
         * The files to upload alongside this Embed
         * @type {Array<FileOptions|string|MessageAttachment>}
         */
        this.files = [];
    }

    /**
     * Sets the title of this embed.
     * @param {StringResolvable} title The title
     * @returns {TranslationEmbed} This embed
     */
    setTitle(title) {
        this.title = title;
        return this;
    }

    /**
     * Sets the description of this embed.
     * @param {StringResolvable} description The description
     * @returns {TranslationEmbed} This embed
     */
    setDescription(description) {
        this.description = description;
        return this;
    }

    /**
     * Sets the URL of this embed.
     * @param {string} url The URL
     * @returns {TranslationEmbed} This embed
     */
    setURL(url) {
        this.url = url;
        return this;
    }

    /**
     * Sets the color of this embed.
     * @param {ColorResolvable} color The color of the embed
     * @returns {TranslationEmbed} This embed
     */
    setColor(color) {
        this.color = Util.resolveColor(color);
        return this;
    }

    /**
     * Sets the author of this embed.
     * @param {StringResolvable} name The name of the author
     * @param {string} [icon] The icon URL of the author
     * @param {string} [url] The URL of the author
     * @returns {TranslationEmbed} This embed
     */
    setAuthor(name, icon, url) {
        this.author = { name: name, icon_url: icon, url };
        return this;
    }

    /**
     * Sets the timestamp of this embed.
     * @param {Date|number} [timestamp=Date.now()] The timestamp or date
     * @returns {TranslationEmbed} This embed
     */
    setTimestamp(timestamp = Date.now()) {
        if (timestamp instanceof Date) timestamp = timestamp.getTime();
        this.timestamp = timestamp;
        return this;
    }

    /**
     * Adds a field to the embed (max 25).
     * @param {StringResolvable} name The name of the field
     * @param {StringResolvable} value The value of the field
     * @param {boolean} [inline=false] Set the field to display inline
     * @returns {TranslationEmbed} This embed
     */
    addField(name, value, inline = false) {
        if (this.fields.length >= 25) throw new RangeError("MessageEmbeds may not exceed 25 fields.");
        this.fields.push({ name, value, inline });
        return this;
    }

    /**
     * Convenience function for `<MessageEmbed>.addField('\u200B', '\u200B', inline)`.
     * @param {boolean} [inline=false] Set the field to display inline
     * @returns {TranslationEmbed} This embed
     */
    addBlankField(inline = false) {
        return this.addField("\u200B", "\u200B", inline);
    }

    /**
     * Set the thumbnail of this embed.
     * @param {string} url The URL of the thumbnail
     * @returns {TranslationEmbed} This embed
     */
    setThumbnail(url) {
        this.thumbnail = { url };
        return this;
    }

    /**
     * Set the image of this embed.
     * @param {string} url The URL of the image
     * @returns {TranslationEmbed} This embed
     */
    setImage(url) {
        this.image = { url };
        return this;
    }

    /**
     * Sets the footer of this embed.
     * @param {StringResolvable} text The text of the footer
     * @param {string} [icon] The icon URL of the footer
     * @returns {TranslationEmbed} This embed
     */
    setFooter(text, icon) {
        this.footer = { text, icon_url: icon };
        return this;
    }

    /**
     * Sets the files to upload alongside the embed. A file can be accessed via `attachment://fileName.extension` when
     * setting an embed image or author/footer icons. Multiple files can be attached.
     * @param {Array<FileOptions|string|MessageAttachment>} files Files to attach
     * @returns {TranslationEmbed}
     */
    attachFiles(files) {
        if (!Array.isArray(files)) files = [files];
        files = files.map(file => file instanceof MessageAttachment ? file.file : file);
        this.files = this.files.concat(files);
        return this;
    }

    resolve(i18n) {
        return new MessageEmbed({
            title: this.title && Resolvable.resolve(this.title, i18n),
            description: this.description && Resolvable.resolve(this.description, i18n),
            url: this.url,
            color: this.color,
            author: this.author ? {
                name: Resolvable.resolve(this.author.name, i18n),
                url: this.author.url,
                icon_url: this.author.iconURL || this.author.icon_url,
            } : null,
            timestamp: this.timestamp ? new Date(this.timestamp) : null,
            fields: this.fields ? this.fields.map(field => ({
                name: Resolvable.resolve(field.name, i18n),
                value: Resolvable.resolve(field.value, i18n),
                inline: field.inline,
            })) : null,
            thumbnail: this.thumbnail,
            image: this.image,
            footer: this.footer ? {
                text: Resolvable.resolve(this.footer.text, i18n),
                icon_url: this.footer.iconURL || this.footer.icon_url,
            } : null,
        }).attachFiles(this.files || []);
    }
}

module.exports = TranslationEmbed;
