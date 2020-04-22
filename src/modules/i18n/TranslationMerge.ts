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

export default class TranslationMerge extends ResolvableObject<string> {
    arr: Resolvable<string>[];
    sep: string = " ";

    constructor(...arr: (Resolvable<string> | undefined)[]) {
        super();
        this.arr = arr.filter(i => typeof i !== "undefined") as Resolvable<string>[];
    }

    separator(sep: string = " "): this {
        this.sep = sep;
        return this;
    }

    push(...items: (Resolvable<string> | undefined)[]): this {
        this.arr = this.arr.concat(items.filter(i => typeof i !== "undefined") as Resolvable<string>[]);
        return this;
    }

    resolve(i18n: I18nLocale) {
        return this.arr.map(trans => ResolvableObject.resolve(trans, i18n)).join(this.sep);
    }
}
