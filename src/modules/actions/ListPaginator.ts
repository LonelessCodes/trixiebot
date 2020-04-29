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
import Paginator, { PaginatorOptions } from "./Paginator";
import { Resolvable } from "../i18n/Resolvable";
import LocaleManager from "../../core/managers/LocaleManager";
import TranslationEmbed from "../i18n/TranslationEmbed";
import TranslationMerge from "../i18n/TranslationMerge";
import Translation from "../i18n/Translation";

export interface ListPaginatorOptions extends PaginatorOptions {
    items_per_page?: number;
    show_page_numbers?: boolean;
    wrap_page_ends?: boolean;
    number_items?: boolean;
    prefix?: Resolvable<string>;
    suffix?: Resolvable<string>;
}

export default class ListPaginator extends Paginator {
    items: Resolvable<string>[];
    total_items: number;
    page_count: number;

    items_per_page: number;
    show_page_numbers: boolean;
    wrap_page_ends: boolean;
    number_items: boolean;
    prefix: Resolvable<string>;
    suffix: Resolvable<string>;

    page_num: number = 1;

    constructor(
        title: Resolvable<string>,
        items: Resolvable<string>[],
        channel: Discord.MessageTarget,
        locale: LocaleManager,
        user: Discord.User,
        opts: ListPaginatorOptions = {}
    ) {
        super(title, channel, locale, user, opts);

        this.items = items;
        this.total_items = items.length;

        this.items_per_page = opts.items_per_page || 15;
        this.show_page_numbers = typeof opts.show_page_numbers !== "undefined" ? opts.show_page_numbers : true;
        this.wrap_page_ends = typeof opts.wrap_page_ends !== "undefined" ? opts.wrap_page_ends : true;
        this.number_items = typeof opts.number_items !== "undefined" ? opts.number_items : false;
        this.prefix = opts.prefix || "";
        this.suffix = opts.suffix || "";

        this.page_count = Math.ceil(this.total_items / this.items_per_page);
    }

    render(type: number) {
        this.page_num += type;
        if (this.wrap_page_ends) {
            if (this.page_num < 1) this.page_num = this.page_count + this.page_num;
            else if (this.page_num > this.page_count) this.page_num -= this.page_count;
        } else {
            // eslint-disable-next-line no-lonely-if
            if (this.page_num < 1) this.page_num = 1;
            else if (this.page_num > this.page_count) this.page_num = this.page_count;
        }

        const embed = new TranslationEmbed().setColor(CONST.COLOR.PRIMARY);

        const start = (this.page_num - 1) * this.items_per_page;
        const end =
            this.items.length < this.page_num * this.items_per_page ? this.items.length : this.page_num * this.items_per_page;

        const rows = new TranslationMerge(this.prefix);
        for (let i = start; i < end; i++) {
            let str = "";
            if (this.number_items) str += "`" + (i + 1) + ".` ";
            str += this.items[i] + "\n";
            rows.push(str);
        }
        rows.push(this.suffix);
        embed.setDescription(rows.separator("\n"));

        if (this.show_page_numbers)
            embed.setFooter(new Translation("paginator.page", "Page {{page}}", { page: `${this.page_num}/${this.page_count}` }));

        return {
            embed,
            done: this.page_count === 1,
        };
    }
}
