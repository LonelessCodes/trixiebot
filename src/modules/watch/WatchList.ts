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

import CONST from "../../const";
import Discord from "discord.js";
import Paginator from "../actions/Paginator";
import LocaleManager from "../../core/managers/LocaleManager";
import TranslationEmbed from "../i18n/TranslationEmbed";
import TranslationMerge from "../i18n/TranslationMerge";
import Translation from "../i18n/Translation";

import { DerpiDocument } from "./watchers/DerpiWatcher";
import Derpibooru from "../Derpibooru";

interface WatchEntry {
    id: number;
    service: string;
    tags: string;
    channel: Discord.TextChannel;
}

export default class WatchList extends Paginator {
    channel: Discord.TextChannel;

    watchers: WatchEntry[];
    total_items: number;
    total_watchers: number;
    page_count: number;

    items_per_page: number = 20;

    page_num: number = 1;

    constructor(watchers: DerpiDocument[], channel: Discord.TextChannel, locale: LocaleManager, user: Discord.User) {
        super(new Translation("watch.list.title", "Watch Triggers"), channel, locale, user);

        this.channel = channel;

        const processed_watchers: WatchEntry[] = [];

        for (const watcher of watchers) {
            const ch = channel.guild.channels.cache.get(watcher.channelId) as Discord.TextChannel | undefined;
            if (!ch) continue;
            processed_watchers.unshift({ channel: ch, id: watcher.id, service: "derpi", tags: Derpibooru.encodeTags(watcher.tags) });
        }

        this.watchers = processed_watchers
            .sort((a, b) => {
                if (a.id < b.id) return -1;
                if (a.id > b.id) return 1;
                return 0;
            })
            .sort((a, b) => {
                if (a.channel.position < b.channel.position) return -1;
                if (a.channel.position > b.channel.position) return 1;
                return 0;
            });

        this.total_items = this.watchers.length;
        this.total_watchers = watchers.length;

        this.page_count = Math.ceil(this.total_items / this.items_per_page);
    }

    setHeader(page: TranslationEmbed) {
        const guild_header = this.channel.guild.name;
        const author_icon = this.channel.guild.iconURL({ size: 32, dynamic: true });

        if (author_icon) page.setAuthor(new TranslationMerge(guild_header, "|", this.title), author_icon);
        else page.setAuthor(new TranslationMerge(guild_header, "|", this.title));

        return page;
    }

    render(type: number) {
        if (this.watchers.length === 0) {
            return {
                embed: new TranslationEmbed()
                    .setColor(CONST.COLOR.PRIMARY)
                    .setDescription(new Translation("watch.empty", "Hehe, nothing here lol. Time to add some.")),
                done: true,
            };
        }

        this.page_num += type;
        if (this.page_num < 1) this.page_num = this.page_count + this.page_num;
        else if (this.page_num > this.page_count) this.page_num -= this.page_count;

        const embed = new TranslationEmbed().setColor(CONST.COLOR.PRIMARY);

        embed.setDescription(new Translation("watch.list.description", "Reply with the number you want to remove."));

        const start = (this.page_num - 1) * this.items_per_page;
        const end =
            this.watchers.length < this.page_num * this.items_per_page ? this.watchers.length : this.page_num * this.items_per_page;

        // build list
        let lastChannel = this.watchers[start].channel;
        let str = "";

        for (let i = start; i < end; i++) {
            const stream = this.watchers[i];
            if (stream.channel.id !== lastChannel.id) {
                embed.addField("#" + lastChannel.name, str);
                str = "";
            }

            str += `\`#${stream.id}\` \`${stream.service}\` \`${stream.tags}\`\n`;

            lastChannel = stream.channel;
        }

        embed.addField("#" + lastChannel.name, str);

        embed.setFooter(
            new TranslationMerge(
                new Translation("paginator.page", "Page {{page}}", { page: `${this.page_num}/${this.page_count}` }),
                "|",
                new Translation("watch.list.footer", "Total Watch Triggers: {{watchers}}", { watchers: this.total_watchers })
            )
        );

        return {
            embed,
            done: this.page_count === 1,
        };
    }
}
