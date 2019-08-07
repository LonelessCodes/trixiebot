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

const Events = require("events");
// eslint-disable-next-line no-unused-vars
const CalendarRange = require("./CalendarRange");
const random = require("../modules/random/random");

class CalendarStatus extends Events {
    /**
     * @param {CalendarRange} range
     * @param {string|string[]} status
     */
    constructor(range, status) {
        super();

        this.range = range;
        this.statuses = !Array.isArray(status) ? [status] : status;

        this.range
            .on("start", () => this.emit("start"))
            .on("end", () => this.emit("end"));
    }

    getStatus() {
        return random(this.statuses);
    }

    isToday() {
        return this.range.isToday();
    }
}

module.exports = CalendarStatus;
