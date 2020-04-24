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
import { EventEmitter } from "events";

export default class CalendarRange extends EventEmitter {
    public active: boolean;

    private start_job: CronJob | undefined;
    private end_job: CronJob | undefined;

    constructor(public start?: string | undefined, public end?: string | undefined) {
        super();

        if (this.start && this.end) {
            this.start_job = new CronJob(this.start, this.startTick.bind(this), null, true);
            this.end_job = new CronJob(this.end, this.endTick.bind(this), null, true);

            this.active = false;

            this.checkJobs();
        } else {
            this.active = true;
        }
    }

    checkJobs() {
        if (!this.start_job || !this.end_job) return;

        const start = this.start_job.nextDate();
        const end = this.end_job.nextDate();

        if (!start.isAfter(end)) {
            this.active = false;
        } else if (!this.active) {
            this.active = true;
            setImmediate(() => this.emit("start"));
        }
    }

    isToday() {
        return this.active;
    }

    startTick() {
        if (this.active) return;
        this.active = true;

        this.emit("start");
    }

    endTick() {
        if (!this.active) return;
        this.active = false;

        this.emit("end");
    }
}
