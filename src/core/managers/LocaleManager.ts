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

import path from "path";
import { Db } from "mongodb";
import Discord from "discord.js";
import I18n, { I18nLocale } from "../../modules/i18n/I18n";
import DocumentMapCache from "../../modules/db/DocumentMapCache";
import TranslationEmbed from "../../modules/i18n/TranslationEmbed";
import { Resolvable, ResolvableObject } from "../../modules/i18n/Resolvable";
import { Except } from "type-fest";

export interface LocaleConfig {
    guildId: string;
    global: string;
    channels: { [c: string]: string | undefined };
}

export type ResolvableMessageOptions =
    | Discord.MessageOptions
    | (Discord.MessageOptions & {
          embed?: Discord.MessageEmbed | Discord.MessageEmbedOptions | TranslationEmbed;
          content?: Resolvable<string>;
      });
export type ResolvableMessageAdditions =
    | TranslationEmbed
    | Discord.MessageEmbed
    | Discord.MessageAttachment
    | Discord.MessageAttachment[];

export type ResolvableMessageEditOptions =
    | Discord.MessageEditOptions
    | (Except<Discord.MessageEditOptions, "content"> & {
          embed?: Discord.MessageEmbed | Discord.MessageEmbedOptions | TranslationEmbed | null;
          content?: Resolvable<string>;
      });
export type ResolvableMessageEditAdditions = TranslationEmbed | Discord.MessageEmbed;

export default class LocaleManager {
    private _cache: DocumentMapCache<"guildId", string, LocaleConfig>;

    constructor(public client: Discord.Client, db: Db) {
        this._cache = new DocumentMapCache(db.collection("locale"), "guildId");
    }

    get(guildId: string): Promise<LocaleConfig>;
    get(guildId: string, channelId: string): Promise<string>;

    async get(guildId: string, channelId?: string) {
        let config = await this._cache.get(guildId);
        if (!config) config = { guildId, global: "en", channels: {} };

        if (channelId) {
            return config.channels[channelId] || config.global;
        }
        return config;
    }

    set(guildId: string, locale: string): Promise<void>;
    set(guildId: string, locale: LocaleConfig): Promise<void>;
    set(guildId: string, channelId: string, locale: string): Promise<void>;

    async set(guildId: string, channelId: string | LocaleConfig, locale?: string) {
        if (typeof channelId === "string" && typeof locale === "undefined") {
            if (!["default", ...LocaleManager.i18n.getLocales()].includes(channelId)) throw new Error("Not a known locale");

            const config = await this.get(guildId);
            await this._cache.set(guildId, { ...config, global: channelId });
        } else if (typeof channelId === "string" && typeof locale === "string") {
            if (!["default", ...LocaleManager.i18n.getLocales()].includes(locale)) throw new Error("Not a known locale");

            const config = await this._cache.get(guildId);
            if (!config) return;

            if (locale === "default" && config.channels[channelId]) delete config.channels[channelId];
            else config.channels[channelId] = locale;
            await this._cache.set(guildId, config);
        } else if (typeof channelId === "object") {
            await this._cache.set(guildId, {
                global: channelId.global,
                channels: channelId.channels,
            });
        }
    }

    delete(guildId: string): Promise<void>;
    delete(guildId: string, channelId: string): Promise<void>;

    async delete(guildId: string, channelId?: string) {
        if (typeof channelId === "undefined") {
            await this._cache.delete(guildId);
        } else {
            const config = await this._cache.get(guildId);
            if (!config) return;

            if (config.channels[channelId]) delete config.channels[channelId];
            await this._cache.set(guildId, config);
        }
    }

    async translator(ch: Discord.MessageTarget): Promise<I18nLocale> {
        if (ch instanceof Discord.TextChannel) return LocaleManager.i18n.getTranslator(await this.get(ch.guild.id, ch.id));
        if (ch instanceof Discord.Webhook) return LocaleManager.i18n.getTranslator(await this.get(ch.guildID, ch.channelID));
        return LocaleManager.i18n.getTranslator(); // if it's not a TextChannel, get default Translator
    }

    async translate<T>(ch: Discord.MessageTarget, resolvable: Resolvable<T>): Promise<T> {
        return ResolvableObject.resolve(resolvable, await this.translator(ch));
    }

    // Dispatching stuff

    private async _resolveMsg(
        ch: Discord.MessageTarget,
        content: undefined | Resolvable<string>,
        options: ResolvableMessageOptions | ResolvableMessageEditOptions
    ): Promise<Discord.MessageOptions | Discord.MessageEditOptions> {
        let translator: I18nLocale | undefined;

        if (options.embed && options.embed instanceof TranslationEmbed) {
            options.embed = options.embed.resolve(translator || (translator = await this.translator(ch)));
        }

        if (options.content) content = options.content;
        if (content instanceof ResolvableObject) {
            content = content.resolve(translator || (translator = await this.translator(ch)));
        }

        return { ...options, content: content };
    }

    private _transformMsg(
        ch: Discord.MessageTarget,
        content:
            | undefined
            | Resolvable<string>
            | ResolvableMessageOptions
            | ResolvableMessageAdditions
            | ResolvableMessageEditOptions
            | ResolvableMessageEditAdditions,
        options?:
            | ResolvableMessageOptions
            | ResolvableMessageAdditions
            | ResolvableMessageEditOptions
            | ResolvableMessageEditAdditions
    ): Promise<Discord.MessageOptions | Discord.MessageEditOptions> {
        if (
            typeof options === "undefined" &&
            typeof content !== "string" &&
            !(content instanceof ResolvableObject && !(content instanceof TranslationEmbed))
        ) {
            options = content;
            content = undefined;
        }
        if (typeof options === "undefined") options = {};

        // MessageAdditions
        if (Array.isArray(options)) {
            return this._resolveMsg(ch, content as Resolvable<string>, { files: options });
        } else if (options instanceof Discord.MessageAttachment) {
            return this._resolveMsg(ch, content as Resolvable<string>, { files: [options] });
        } else if (options instanceof Discord.MessageEmbed || options instanceof TranslationEmbed) {
            return this._resolveMsg(ch, content as Resolvable<string>, { embed: options } as ResolvableMessageOptions);
        }

        return this._resolveMsg(ch, content as Resolvable<string>, options);
    }

    send(ch: Discord.MessageTarget, options: ResolvableMessageOptions): Promise<Discord.Message>;
    send(ch: Discord.MessageTarget, options: ResolvableMessageAdditions): Promise<Discord.Message>;
    send(ch: Discord.MessageTarget, content: Resolvable<string>): Promise<Discord.Message>;
    send(ch: Discord.MessageTarget, content: Resolvable<string>, options: ResolvableMessageOptions): Promise<Discord.Message>;
    send(ch: Discord.MessageTarget, content: Resolvable<string>, options: ResolvableMessageAdditions): Promise<Discord.Message>;

    async send(
        ch: Discord.MessageTarget,
        content: Resolvable<string> | ResolvableMessageOptions | ResolvableMessageAdditions,
        options?: ResolvableMessageOptions | ResolvableMessageAdditions
    ): Promise<Discord.Message> {
        const api_message = new Discord.APIMessage(ch, await this._transformMsg(ch, content, options));
        // Change the interface of the returned Message object to support editing with
        // Translation objects
        return this._addEdit(await ch.send(api_message));
    }

    edit(msg: Discord.Message, options: ResolvableMessageEditOptions): Promise<Discord.Message>;
    edit(msg: Discord.Message, options: ResolvableMessageEditAdditions): Promise<Discord.Message>;
    edit(msg: Discord.Message, content: Resolvable<string>): Promise<Discord.Message>;
    edit(msg: Discord.Message, content: Resolvable<string>, options?: ResolvableMessageEditOptions): Promise<Discord.Message>;
    edit(msg: Discord.Message, content: Resolvable<string>, options?: ResolvableMessageEditAdditions): Promise<Discord.Message>;

    async edit(
        msg: Discord.Message,
        content: Resolvable<string> | ResolvableMessageEditOptions | ResolvableMessageEditAdditions,
        options?: ResolvableMessageEditOptions | ResolvableMessageEditAdditions
    ) {
        if (msg.channel instanceof Discord.TextChannel || msg.channel instanceof Discord.DMChannel) {
            return await msg.edit(await this._transformMsg(msg.channel, content, options));
        }
        throw new Error("Cannot edit a Message not coming from a TextChannel or DMChannel");
    }

    private _addEdit(msg: Discord.Message): Discord.Message {
        const old_edit = msg.edit.bind(msg);
        return Object.assign(msg, {
            edit: async (
                content: Resolvable<string> | ResolvableMessageEditOptions | ResolvableMessageEditAdditions | Discord.APIMessage,
                options?: ResolvableMessageEditOptions | ResolvableMessageEditAdditions
            ) => {
                const _old_edit = msg.edit.bind(msg);
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore
                await this.edit(Object.assign(msg, { edit: old_edit }), content, options);
                Object.assign(msg, { edit: _old_edit });
                return msg;
            },
        });
    }

    // STATIC

    static i18n = new I18n({
        auto_reload: true,
        default_locale: "en",
        directory: path.join(__dirname, "..", "..", "..", "assets", "locale"),
        update_files: true,
    });

    static getLocaleInfo(locale: string) {
        return {
            code: locale,
            name: LocaleManager.i18n.translate(locale, "general.lang_name"),
            name_en: LocaleManager.i18n.translate(locale, "general.lang_name_en"),
        };
    }

    static getLocales() {
        return LocaleManager.i18n.getLocales().map(locale => LocaleManager.getLocaleInfo(locale));
    }

    static findFit(str: string): string | undefined {
        const locales = LocaleManager.getLocales();

        // check locale codes
        for (const { code } of locales) if (code.toLowerCase() === str.toLowerCase()) return code;
        for (const { code } of locales) if (code.split(/-/g)[0].toLowerCase() === str.split(/-/g)[0].toLowerCase()) return code;

        // check language names
        for (const { name, code } of locales) if (name.toLowerCase() === str.toLowerCase()) return code;
        for (const { name_en, code } of locales) if (name_en.toLowerCase() === str.toLowerCase()) return code;
    }
}
