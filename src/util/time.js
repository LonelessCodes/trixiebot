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

const moment = require("moment");
const TimeUnit = require("../modules/TimeUnit");

const names = ["w", "d", "h", "m", "s"];

function pad(num, size) {
    const s = "00" + num;
    return s.substr(s.length - size);
}

const multiplier = {
    w: TimeUnit.WEEK.toMillis(1),
    d: TimeUnit.DAY.toMillis(1),
    h: TimeUnit.HOUR.toMillis(1),
    m: TimeUnit.MINUTE.toMillis(1),
    s: TimeUnit.SECOND.toMillis(1),
};

module.exports = new class TimeUtils {
    /**
     * @param {number} ms Duration in milliseconds
     * @returns {string}
     */
    toHumanTime(ms) {
        const d = moment.duration(ms);
        const arr = [
            d.weeks(),
            d.days(),
            d.hours(),
            d.minutes(),
            d.seconds(),
        ];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] > 0) arr[i] = pad(arr[i], 2) + names[i];
        }
        return arr.filter(str => !!str).join(" ");
    }

    /**
     * @param {string} string Duration as time string
     * @returns {number}
     */
    parseHumanTime(string) {
        let ms = 0;
        let number = "0";

        const matches = string.match(/[0-9.]+|[dhms]/g);
        for (const match of matches) {
            if (/[0-9.]+/.test(match)) {
                number += match;
            } else if (/\w+/.test(match)) {
                const num = Number.parseFloat(number);
                number = "0";
                if (multiplier[match]) ms += num * multiplier[match];
            }
        }

        return ms;
    }
};
