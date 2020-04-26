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

import { JsonObject } from "type-fest";
import Discord from "discord.js";
import MessageMentions from "../discord/MessageMentions";
import AudioManager, { AudioGuild } from "../../core/managers/AudioManager";
import LocaleManager, {
    ResolvableMessageOptions,
    ResolvableMessageAdditions,
    ResolvableMessageEditAdditions,
    ResolvableMessageEditOptions,
} from "../../core/managers/LocaleManager";
import { I18nLocale } from "../../modules/i18n/I18n";
import { Resolvable } from "../../modules/i18n/Resolvable";

const CHANNEL_TYPE_ERR = "Can only send a message in a TextChannel or DMChannel";

interface MessageContextOptions {
    message: Discord.Message;
    locale: LocaleManager;
    config: JsonObject;
    content: string;
    prefix: string;
    prefix_used: boolean;
    received_at: bigint;
}

export default class MessageContext {
    private _mentions: MessageMentions | null = null;
    private _audio: AudioGuild | null = null;

    public message: Discord.Message;
    public content: string;
    private _locale: LocaleManager;
    public config: JsonObject;
    public prefix: string;
    public prefix_used: boolean;
    public received_at: bigint;

    constructor(opts: MessageContextOptions) {
        this.message = opts.message;
        this.content = opts.content;
        this._locale = opts.locale;
        this.config = opts.config;
        this.prefix = opts.prefix;
        this.prefix_used = opts.prefix_used;
        this.received_at = opts.received_at;
    }

    // GETTERS

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
            // Fix to a bug where Message.member is NULL in guild
            Object.defineProperty(this.message, "member", {
                value: this.guild.member(this.author) || null,
            });
        }
        return this.message.member;
    }

    get audio() {
        if (!this.guild) return null;
        if (!this._audio) this._audio = AudioManager.getGuild(this.guild);
        return this._audio;
    }

    get mentions() {
        if (!this._mentions) this._mentions = new MessageMentions(this.content, this.message);
        return this._mentions;
    }

    // LOCALE METHODS

    locale(): Promise<string>;
    locale(ch: Discord.MessageTarget): Promise<string>;

    locale(ch?: Discord.MessageTarget): Promise<string> {
        if (!ch && this.guild) return this._locale.get(this.guild.id).then(l => l.global);
        if (ch instanceof Discord.TextChannel) return this._locale.get(ch.guild.id, ch.id);
        if (ch instanceof Discord.Webhook) return this._locale.get(ch.guildID, ch.channelID);
        return Promise.resolve(LocaleManager.i18n.default_locale);
    }

    translate(resolvable: Resolvable<string>): Promise<string>;
    translate(ch: Discord.MessageTarget, resolvable: Resolvable<string>): Promise<string>;

    translate(ch: Discord.MessageTarget | Resolvable<string>, resolvable?: Resolvable<string>): Promise<string> {
        if (!resolvable) {
            if (!(this.channel instanceof Discord.TextChannel || this.channel instanceof Discord.DMChannel))
                throw new Error(CHANNEL_TYPE_ERR);
            resolvable = ch as Resolvable<string>;
            ch = this.channel;
        }
        return this._locale.translate(ch as Discord.MessageTarget, resolvable);
    }

    translator(): Promise<I18nLocale>;
    translator(ch: Discord.MessageTarget): Promise<I18nLocale>;

    translator(ch?: Discord.MessageTarget): Promise<I18nLocale> {
        if (!ch) {
            if (!(this.channel instanceof Discord.TextChannel || this.channel instanceof Discord.DMChannel))
                throw new Error(CHANNEL_TYPE_ERR);
            return this._locale.translator(this.channel);
        }
        return this._locale.translator(ch);
    }

    // MESSAGE FUNCTIONALITY

    send(ch: Discord.MessageTarget, options: ResolvableMessageOptions | ResolvableMessageAdditions): Promise<Discord.Message>;
    send(options: ResolvableMessageOptions | ResolvableMessageAdditions): Promise<Discord.Message>;
    send(
        ch: Discord.MessageTarget,
        content: Resolvable<string>,
        options?: ResolvableMessageOptions | ResolvableMessageAdditions
    ): Promise<Discord.Message>;
    send(content: Resolvable<string>, options?: ResolvableMessageOptions | ResolvableMessageAdditions): Promise<Discord.Message>;

    send(
        ch: Discord.MessageTarget | Resolvable<string> | ResolvableMessageOptions | ResolvableMessageAdditions,
        content?: Resolvable<string> | ResolvableMessageOptions | ResolvableMessageAdditions,
        options?: ResolvableMessageOptions | ResolvableMessageAdditions
    ): Promise<Discord.Message> {
        if (
            ch instanceof Discord.TextChannel ||
            ch instanceof Discord.DMChannel ||
            ch instanceof Discord.User ||
            ch instanceof Discord.GuildMember ||
            ch instanceof Discord.Webhook ||
            ch instanceof Discord.WebhookClient
        ) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            return this._locale.send(ch, content, options);
        }

        if (!(this.channel instanceof Discord.TextChannel || this.channel instanceof Discord.DMChannel))
            throw new Error(CHANNEL_TYPE_ERR);

        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        return this._locale.send(this.channel, ch, content);
    }

    edit(msg: Discord.Message, options: ResolvableMessageEditOptions): Promise<Discord.Message>;
    edit(msg: Discord.Message, options: ResolvableMessageEditAdditions): Promise<Discord.Message>;
    edit(msg: Discord.Message, options: Discord.APIMessage): Promise<Discord.Message>;
    edit(msg: Discord.Message, content: Resolvable<string>): Promise<Discord.Message>;
    edit(msg: Discord.Message, content: Resolvable<string>, options?: ResolvableMessageEditOptions): Promise<Discord.Message>;
    edit(msg: Discord.Message, content: Resolvable<string>, options?: ResolvableMessageEditAdditions): Promise<Discord.Message>;

    async edit(
        msg: Discord.Message,
        content: Resolvable<string> | ResolvableMessageEditOptions | ResolvableMessageEditAdditions | Discord.APIMessage,
        options?: ResolvableMessageEditOptions | ResolvableMessageEditAdditions
    ) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        return this._locale.edit(msg, content, options);
    }
}
