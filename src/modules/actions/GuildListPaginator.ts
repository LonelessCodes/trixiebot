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
import ListPaginator, { ListPaginatorOptions } from "./ListPaginator";
import { Resolvable } from "../i18n/Resolvable";
import LocaleManager from "../../core/managers/LocaleManager";
import TranslationEmbed from "../i18n/TranslationEmbed";
import TranslationMerge from "../i18n/TranslationMerge";

export default class GuildListPaginator extends ListPaginator {
    channel: Discord.TextChannel;

    constructor(
        title: Resolvable<string>,
        items: Resolvable<string>[],
        channel: Discord.TextChannel,
        locale: LocaleManager,
        user: Discord.User,
        opts: ListPaginatorOptions = {}
    ) {
        super(title, items, channel, locale, user, opts);

        this.channel = channel;
    }

    setHeader(page: TranslationEmbed) {
        const guild_header = this.channel.guild.name;
        const author_icon = this.channel.guild.iconURL({ size: 32, dynamic: true });

        if (author_icon) page.setAuthor(new TranslationMerge(guild_header, "|", this.title), author_icon);
        else page.setAuthor(new TranslationMerge(guild_header, "|", this.title));

        return page;
    }
}
