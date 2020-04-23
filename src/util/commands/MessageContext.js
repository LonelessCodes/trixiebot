/* eslint-disable require-atomic-updates */
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

// eslint-disable-next-line no-unused-vars
const { TextChannel, Message } = require("discord.js");
const MessageMentions = require("./MessageMentions");
const AudioManager = require("../../core/managers/AudioManager");
// eslint-disable-next-line no-unused-vars
const LocaleManager = require("../../core/managers/LocaleManager").default;
// eslint-disable-next-line no-unused-vars
const { I18nLocale } = require("../../modules/i18n/I18n");
// eslint-disable-next-line no-unused-vars
const { Resolvable } = require("../../modules/i18n/Resolvable");

class MessageContext {
    /**
     * @param {Message} message
     * @param {LocaleManager} locale_manager
     * @param {Object} config
     * @param {string} content
     * @param {string|null} prefix
     * @param {boolean} prefix_used
     * @param {bigint} received_at
     */
    constructor(message, locale_manager, config, content, prefix, prefix_used, received_at) {
        this._locale = locale_manager;

        this.message = message;
        this.config = config;
        this.content = content;
        this.prefix = prefix;
        this.prefix_used = prefix_used;
        this.received_at = received_at;

        this._mentions = null;
        this._audio = null;
    }

    get ctx() {
        return this;
    }

    get client() {
        return this.message.client;
    }
    get channel() {
        return this.message.channel;
    }
    get guild() {
        return this.message.guild;
    }
    get author() {
        return this.message.author;
    }
    get member() {
        if (!this.guild) return null;

        if (!this.message.member) {
            this.message.member = this.guild.member(this.author) || null;
        }
        return this.message.member;
    }

    get audio() {
        if (!this._audio) this._audio = AudioManager.getGuild(this.guild);
        return this._audio;
    }

    get mentions() {
        if (!this._mentions) this._mentions = new MessageMentions(this.content, this.guild);
        return this._mentions;
    }

    /**
     * @param {TextChannel} [ch]
     * @returns {Promise<{ global: string, channels: Object<string, string>} | string>}
     */
    locale(ch) {
        if (ch instanceof TextChannel) return this._locale.get(ch.guild.id, ch.id);
        else return this._locale.get(this.guild.id);
    }

    /**
     * @param {TextChannel|Resolvable} ch
     * @param {Resolvable} [resolvable]
     * @returns {Promise<string>}
     */
    translate(ch, resolvable) {
        if (ch instanceof TextChannel) return this._locale.translate(ch, resolvable);
        else return this._locale.translate(this.channel, ch);
    }

    /**
     * @param {TextChannel|Resolvable} ch
     * @returns {Promise<I18nLocale>}
     */
    translator(ch) {
        if (ch instanceof TextChannel) return this._locale.translator(ch);
        return this._locale.translator(this.channel);
    }

    edit(msg, content, options) {
        return this._locale.edit(msg, content, options);
    }

    send(...args) {
        if (args[0] instanceof TextChannel) return this._locale.send(args[0], ...args.slice(1));
        else return this._locale.send(this.channel, ...args);
    }
}

module.exports = MessageContext;
