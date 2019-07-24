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
const { CronJob } = require("cron");

class Calendar extends Events {
    constructor(month, date, hour, minute) {
        super();

        this.setDate(month, date, hour, minute);
    }

    setDate(month, date, hour, minute) {
        this.month = month;
        this.date = date;
        this.hour = hour;
        this.minute = minute;

        this.setStartJob();
    }

    setStartJob() {
        if (this.startJob) this.startJob.stop();

        const now = new Date;
        let cal = new Date(now.getFullYear(), this.month, this.date, this.hour, this.minute);
        if (now.getTime() >= cal.getTime()) {
            cal = new Date(now.getFullYear() + 1, this.month, this.date, this.hour, this.minute);
        }

        this.startJob = new CronJob(cal, () => {
            this.emit("start", this);

            this.setStartJob();
        }, null, false, "Europe/London").start();
    }

    setEndJob() {
        if (this.endJob) this.endJob.stop();

        const now = new Date;
        let ms = new Date(now.getFullYear(), this.month, this.date, this.hour, this.minute).getTime();
        let cal = new Date(ms + (3600000 * 24));
        if (now.getTime() >= cal.getTime()) {
            ms = new Date(now.getFullYear() + 1, this.month, this.date, this.hour, this.minute).getTime();
            cal = new Date(ms + (3600000 * 24));
        }

        this.endJob = new CronJob(cal, () => {
            this.emit("end", this);

            this.setEndJob();
        }, null, false, "Europe/London").start();
    }

    isToday(date) {
        const now = date || new Date;
        const cal = new Date(now.getFullYear(), this.month, this.date);

        return now.getFullYear() === cal.getFullYear() &&
            now.getMonth() === cal.getMonth() &&
            now.getDate() === cal.getDate();
    }
}

Calendar.MONTH = Object.freeze({
    JANUARY: 0,
    FEBRUARY: 1,
    MARCH: 2,
    APRIL: 3,
    MAY: 4,
    JUNE: 5,
    JULY: 6,
    AUGUST: 7,
    SEPTEMBER: 8,
    OCTOBER: 9,
    NOVEMBER: 10,
    DECEMBER: 11,
});

Calendar.WEEK = Object.freeze({
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
});

module.exports = Calendar;
