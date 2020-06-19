/*
 * Copyright (C) 2020 Christian Schäfer / Loneless
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

import Discord from "discord.js";
import LocaleManager from "../../core/managers/LocaleManager";
import TranslationEmbed from "../i18n/TranslationEmbed";
import { Resolvable } from "../i18n/Resolvable";
import { doNothing, userToString } from "../../util/util";
import TranslationMerge from "../i18n/TranslationMerge";

export interface PaginatorOptions {
    timeout?: number;
}

/**
 * Low level extendable Paginator class
 */
export default abstract class Paginator {
    title: Resolvable<string>;
    channel: Discord.MessageTarget;
    locale: LocaleManager;
    user: Discord.User;
    message: Discord.Message | null = null;

    timeout: number;

    constructor(
        title: Resolvable<string>,
        channel: Discord.MessageTarget,
        locale: LocaleManager,
        user: Discord.User,
        opts: PaginatorOptions = {}
    ) {
        this.title = title;
        this.channel = channel;
        this.locale = locale;
        this.user = user;

        this.timeout = opts.timeout || 60000;
    }

    /**
     * Begins pagination on page 1 as a new Message
     * @returns {Promise<Message>}
     */
    async display(): Promise<Discord.Message> {
        if (this.message) return this.message;

        const { embed, done } = await this.render(0);
        const page = this.setHeader(embed);

        if (done) return await this.locale.send(this.channel, page);

        return await this._initialize(await this.locale.send(this.channel, page));
    }

    private async _initialize(message: Discord.Message): Promise<Discord.Message> {
        this._pagination((this.message = message));

        await message.react(Paginator.LEFT);
        await message.react(Paginator.STOP);
        await message.react(Paginator.RIGHT);

        return this.message;
    }

    private _pagination(message: Discord.Message) {
        const collector = message.createReactionCollector((reaction, user) => this._checkReaction(reaction, user), {
            time: this.timeout,
            max: 1,
        });

        collector.on("end", (collected, reason) => {
            const reaction = collected.first();
            if (reason === "time" || !reaction) return this.end();
            if (message !== this.message) return; // if paginator was ended

            this._handleMessageReactionAddAction(reaction, message).catch(doNothing);
        });
    }

    private _checkReaction(reaction: Discord.MessageReaction, user: Discord.User): boolean {
        if (user.id !== this.user.id) return false;

        switch (reaction.emoji.name) {
            case Paginator.LEFT:
            case Paginator.STOP:
            case Paginator.RIGHT:
                return true;
            default:
                return false;
        }
    }

    private async _handleMessageReactionAddAction(reaction: Discord.MessageReaction, message: Discord.Message) {
        let page_dir = 0;
        switch (reaction.emoji.name) {
            case Paginator.LEFT:
                page_dir = -1;
                break;
            case Paginator.RIGHT:
                page_dir = +1;
                break;
            case Paginator.STOP:
                this.end();
                return;
        }

        reaction.users.remove(this.user).catch(doNothing);

        const { embed, done } = await this.render(page_dir);
        const page = this.setHeader(embed);

        if (done) {
            await this.locale.edit(message, page);
            this.end();
            return;
        }

        this._pagination((this.message = await this.locale.edit(message, page)));
    }

    setHeader(page: TranslationEmbed) {
        const user_header = userToString(this.user, true);
        const author_icon = this.user.avatarURL({ size: 32, dynamic: true });

        if (author_icon) page.setAuthor(new TranslationMerge(user_header, "|", this.title), author_icon);
        else page.setAuthor(new TranslationMerge(user_header, "|", this.title));

        return page;
    }

    abstract render(
        type: number
    ): Promise<{ embed: TranslationEmbed; done: boolean }> | { embed: TranslationEmbed; done: boolean };

    end() {
        if (!this.message) return;

        this.message.reactions.removeAll().catch(doNothing);
        this.message = null;
    }

    // ◀ ⏹ ▶
    static LEFT = "◀";
    static STOP = "⏹";
    static RIGHT = "▶";
}
