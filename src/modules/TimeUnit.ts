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

import TranslationPlural from "./i18n/TranslationPlural";
import { format } from "../util/string";

export default class TimeUnit {
    private _millis: number;
    translation: TranslationPlural;

    constructor(millis: number, phrase: TranslationPlural) {
        this._millis = millis;
        this.translation = phrase;
    }

    toMillis(number: number): number {
        return this._millis * number;
    }

    toNum(millis: number): number {
        return millis / this._millis;
    }

    toString(number: number): string {
        if (typeof number === "number") {
            return number === 1
                ? format(this.translation.phrase.one, { count: number })
                : format(this.translation.phrase.other, { count: number });
        }
        return this.translation.phrase.one;
    }

    toTranslation(number?: number | undefined): TranslationPlural {
        if (typeof number === "number") {
            return this.translation.clone(number);
        }
        return this.translation;
    }

    static MSECOND = new TimeUnit(1, new TranslationPlural("time.millis", ["{{count}} millisecond", "{{count}} milliseconds"]));
    static SECOND = new TimeUnit(1000, new TranslationPlural("time.secs", ["{{count}} second", "{{count}} seconds"]));
    static MINUTE = new TimeUnit(60000, new TranslationPlural("time.mins", ["{{count}} minute", "{{count}} minutes"]));
    static HOUR = new TimeUnit(3600000, new TranslationPlural("time.hrs", ["{{count}} hour", "{{count}} hours"]));
    static DAY = new TimeUnit(3600000 * 24, new TranslationPlural("time.dys", ["{{count}} day", "{{count}} days"]));
    static WEEK = new TimeUnit(3600000 * 24 * 7, new TranslationPlural("time.wks", ["{{count}} week", "{{count}} weeks"]));
}
