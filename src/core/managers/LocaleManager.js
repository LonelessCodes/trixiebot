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

const path = require("path");
const { isPlainObject } = require("../../util/util");
// eslint-disable-next-line no-unused-vars
const { TextChannel, Attachment, RichEmbed, Message } = require("discord.js");
const I18n = require("../../modules/i18n/I18n");
const DocumentMapCache = require("../../modules/db/DocumentMapCache");
const Resolvable = require("../../modules/i18n/Resolvable");
const TranslationEmbed = require("../../modules/i18n/TranslationEmbed");

const i18n = new I18n({
    auto_reload: true,
    default_locale: "en",
    directory: path.join(__dirname, "..", "..", "..", "assets", "locale"),
    update_files: true,
});

class LocaleManager {
    constructor(client, db) {
        this.client = client;
        this.db = db.collection("locale");
        this._cache = new DocumentMapCache(this.db, "guildId");
    }

    async get(guildId, channelid) {
        let config = await this._cache.get(guildId);
        if (!config) config = { global: "en", channels: {} };
        if (typeof config.global !== "string" || !isPlainObject(config.channels)) {
            config.global = typeof config.global !== "string" ? "en" : config.global;
            config.channels = !isPlainObject(config.channels) ? {} : config.channels;
            await this._cache.set(guildId, config);
        }

        if (channelid) {
            return config.channels[channelid] || config.global;
        } else {
            return config;
        }
    }

    async set(guildId, channelId, locale) {
        if (channelId && typeof channelId !== "string") {
            let config = {
                global: channelId.global,
                channels: channelId.channels,
            };
            await this._cache.set(guildId, config);
        } else {
            if (!locale) {
                locale = channelId;
                channelId = null;
            }
            if (!["default", ...i18n.getLocales()].includes(locale)) {
                throw new Error("Not a known locale");
            }
            let config = await this.get(guildId);
            if (channelId) {
                if (/(global|default)/i.test(locale)) delete config.channels[channelId];
                else config.channels[channelId] = locale;
            } else {
                config.global = locale;
            }
            await this._cache.set(guildId, config);
        }
    }

    async delete(guildId, channelId) {
        if (!channelId) {
            await this._cache.delete(guildId);
        } else {
            let config = await this.get(guildId);
            if (config) {
                if (config.channels[channelId]) delete config.channels[channelId];
                await this._cache.set(guildId, config);
            }
        }
    }

    async translator(ch) {
        let locale = "en";
        if (ch instanceof TextChannel) locale = await this.get(ch.guild.id, ch.id);
        return i18n.getTranslator(locale);
    }

    async translate(ch, resolvable) {
        return Resolvable.resolve(resolvable, await this.translator(ch));
    }

    // Dispatching stuff

    /**
     * @param {TextChannel|DMChannel} ch
     * @param {string|Object} content
     * @param {Object} [options]
     */
    async _transformMsg(ch, content, options) {
        if (!options &&
            !(content instanceof Resolvable && !(content instanceof TranslationEmbed)) && typeof content === "object" &&
            !(content instanceof Array)) {
            options = content;
            content = "";
        } else if (!options) {
            options = {};
        }

        const { reply } = options;
        if (options instanceof Attachment) options = { files: [options.file] };
        if (options instanceof RichEmbed || options instanceof TranslationEmbed) options = { embed: options };
        options.reply = reply;

        let translator;

        if (options.embed && options.embed instanceof TranslationEmbed) {
            // eslint-disable-next-line require-atomic-updates
            options.embed = options.embed.resolve(translator || (translator = await this.translator(ch)));
        }

        if (content && typeof content !== "string" && typeof content.resolve === "function") {
            content = Resolvable.resolve(content, translator || (translator = await this.translator(ch)));
        }

        if (content && content !== "") return [content, options];
        else return [options];
    }

    /**
     * @param {Message} msg
     * @param {string|Object} content
     * @param {Object} [options]
     */
    async edit(msg, content, options) {
        const new_msg = await msg.edit(...await this._transformMsg(msg.channel, content, options));
        return this._addEdit(new_msg);
    }

    _addEdit(msg) {
        const oldEdit = msg.edit.bind(msg);
        return Object.assign(msg, {
            edit: async (content, options) => {
                await oldEdit(...await this._transformMsg(msg.channel, content, options));
                return msg;
            },
        });
    }

    /**
     * @param {TextChannel} ch
     * @param {string|Object} content
     * @param {Object} [options]
     */
    async send(ch, content, options) {
        const msg = await ch.send(...await this._transformMsg(ch, content, options));
        // Change the interface of the returned Message object to support editing with
        // Translation objects
        return this._addEdit(msg);
    }
}
LocaleManager.i18n = i18n;

LocaleManager.getLocaleInfo = locale => ({
    code: locale,
    name: i18n.translate(locale, "general.lang_name"),
    name_en: i18n.translate(locale, "general.lang_name_en"),
});
LocaleManager.getLocales = () => i18n.getLocales().map(locale => LocaleManager.getLocaleInfo(locale));

// eslint-disable-next-line valid-jsdoc
/** @type {(str: string) => string} */
LocaleManager.findFit = str => {
    const locales = LocaleManager.getLocales();

    // check locale codes
    for (let { code } of locales) if (code.toLowerCase() === str.toLowerCase()) return code;
    for (let { code } of locales) if (code.split(/-/g)[0].toLowerCase() === str.split(/-/g)[0].toLowerCase()) return code;

    // check language names
    for (let { name, code } of locales) if (name.toLowerCase() === str.toLowerCase()) return code;
    for (let { name_en, code } of locales) if (name_en.toLowerCase() === str.toLowerCase()) return code;
};

module.exports = LocaleManager;
