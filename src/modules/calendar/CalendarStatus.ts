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

import { EventEmitter } from "events";
import CalendarRange from "./CalendarRange";
import random from "../random/random";

export default class CalendarStatus extends EventEmitter {
    public statuses: string[];

    constructor(public range: CalendarRange, status: string | string[]) {
        super();

        this.range = range;
        this.statuses = !Array.isArray(status) ? [status] : status;

        this.range.on("start", () => this.emit("start")).on("end", () => this.emit("end"));
    }

    getStatus() {
        return random(this.statuses);
    }

    isToday() {
        return this.range.isToday();
    }
}
