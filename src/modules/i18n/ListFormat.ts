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

import { ResolvableObject, Resolvable } from "./Resolvable";
import { I18nLocale } from "./I18n";

interface ListFormatOptions {
    type?: "and" | "or";
    style?: "long" | "short";
}

export default class ListFormat extends ResolvableObject<string> {
    arr: Resolvable<string>[];
    opts: Required<ListFormatOptions>;

    constructor(arr: Resolvable<string>[] = [], opts: ListFormatOptions = {}) {
        super();
        this.arr = arr;

        this.opts = { type: "and", style: "long", ...opts };
    }

    push(...args: Resolvable<string>[]) {
        this.arr = this.arr.concat(args);
    }

    resolve(i18n: I18nLocale) {
        if (this.arr.length === 0) return "";

        const arr = this.arr.map(item => ResolvableObject.resolve(item, i18n));

        if (arr.length === 1) return arr[0];

        if (this.opts.style === "long") {
            let sep;
            if (this.opts.type === "and") sep = i18n.translate("format.and", "and");
            else if (this.opts.type === "or") sep = i18n.translate("format.or", "or");

            return `${arr.slice(0, -1).join(", ")} ${sep} ${arr[arr.length - 1]}`;
        }

        return arr.join(", ");
    }
}
