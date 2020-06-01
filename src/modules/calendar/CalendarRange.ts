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

import { CronJob } from "cron";
import moment from "moment";

export default class CalendarRange {
    public active: boolean = false;

    public readonly start: moment.Moment;
    public readonly end: moment.Moment;

    private _start_job?: CronJob;
    private _end_job?: CronJob;

    constructor(start: moment.Moment | Date, end: moment.Moment | Date) {
        this.start = moment(start);
        this.end = moment(end);

        const now = moment();

        if (this.isSame(now)) this.active = true;

        this._start_job = this.start.isAfter(now) ? new CronJob(this.start, () => this.active = true, null, true) : undefined;
        this._end_job = this.end.isAfter(now) ? new CronJob(this.end, () => this.active = false, null, true) : undefined;
    }

    isToday() {
        return this.active;
    }

    isSame(m: moment.Moment = moment()) {
        return m.isBetween(this.start, this.end, null, "[)");
    }

    isAfter(m: moment.Moment = moment()) {
        return this.start.isSameOrAfter(m);
    }

    isBefore(m: moment.Moment = moment()) {
        return this.end.isBefore(m);
    }

    destroy() {
        this._start_job?.stop();
        this._end_job?.stop();
    }
}
