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

import { ResolvableObject } from "./Resolvable";
import { I18nLocale, PluralResolvable, PluralEntry } from "./I18n";
import { formatter, FormatArguments } from "./utils";

type PluralArguments = FormatArguments & { count: string | number };

export default class TranslationPlural extends ResolvableObject<string> {
    public count: number;
    public id: string;
    public phrase: PluralEntry;
    public args: PluralArguments;

    constructor(id: string, phrase: PluralResolvable, args: PluralArguments = { count: 1 }) {
        super();

        if (Array.isArray(phrase)) this.phrase = { one: phrase[0], other: phrase[1] || phrase[0] };
        else if ("singular" in phrase && typeof phrase.singular !== "undefined")
            this.phrase = { one: phrase.singular, other: phrase.plural || phrase.singular };
        else this.phrase = phrase as PluralEntry;

        this.id = id;
        this.count = Number(args["count"]);
        this.args = args;
    }

    clone(num: number): TranslationPlural {
        return new TranslationPlural(
            this.id,
            { ...this.phrase },
            typeof num === "number" ? { ...this.args, count: num } : { ...this.args }
        );
    }

    resolve(i18n: I18nLocale) {
        return formatter(i18n, i18n.translateN(this.id, this.phrase, this.count), this.args);
    }
}
