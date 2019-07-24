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

class TimeUnit {
    constructor(millis, singular, plural) {
        this._millis = millis;
        this.singular = singular;
        this.plural = plural;
    }

    toMillis(number) {
        return this._millis * number;
    }

    toNum(millis) {
        return millis / this._millis;
    }

    toString(number) {
        if (number) {
            return number === 1 ? `${number} ${this.singular}` : `${number} ${this.plural}`;
        } else {
            return this.singular;
        }
    }
}

TimeUnit.MILLISECOND = new TimeUnit(1, "millisecond", "milliseconds");
TimeUnit.SECOND = new TimeUnit(1000, "second", "seconds");
TimeUnit.MINUTE = new TimeUnit(60000, "minute", "minutes");
TimeUnit.HOUR = new TimeUnit(3600000, "hour", "hours");
TimeUnit.DAY = new TimeUnit(3600000 * 24, "day", "days");
TimeUnit.WEEK = new TimeUnit(3600000 * 24 * 7, "week", "weeks");

module.exports = TimeUnit;
