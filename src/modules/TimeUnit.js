/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
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

const TranslationPlural = require("./i18n/TranslationPlural");
const { format } = require("../util/string");

class TimeUnit {
    /**
     * @param {number} millis
     * @param {TranslationPlural} phrase
     */
    constructor(millis, phrase) {
        this._millis = millis;
        this.translation = phrase;
    }

    toMillis(number) {
        return this._millis * number;
    }

    toNum(millis) {
        return millis / this._millis;
    }

    toString(number) {
        if (typeof number === "number") {
            return number === 1 ?
                format(this.translation.phrase[0], { count: number }) :
                format(this.translation.phrase[1], { count: number });
        } else {
            return this.translation.phrase[0];
        }
    }

    toTranslation(number) {
        if (typeof number === "number") {
            return this.translation.clone(number);
        } else {
            return this.translation.phrase[0];
        }
    }
}

TimeUnit.MILLISECOND = new TimeUnit(1, new TranslationPlural("time.millis", ["{{count}} millisecond", "{{count}} milliseconds"]));
TimeUnit.SECOND = new TimeUnit(1000, new TranslationPlural("time.secs", ["{{count}} second", "{{count}} seconds"]));
TimeUnit.MINUTE = new TimeUnit(60000, new TranslationPlural("time.mins", ["{{count}} minute", "{{count}} minutes"]));
TimeUnit.HOUR = new TimeUnit(3600000, new TranslationPlural("time.hrs", ["{{count}} hour", "{{count}} hours"]));
TimeUnit.DAY = new TimeUnit(3600000 * 24, new TranslationPlural("time.dys", ["{{count}} day", "{{count}} days"]));
TimeUnit.WEEK = new TimeUnit(3600000 * 24 * 7, new TranslationPlural("time.wks", ["{{count}} week", "{{count}} weeks"]));

module.exports = TimeUnit;
