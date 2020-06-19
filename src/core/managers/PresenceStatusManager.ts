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

import Discord from "discord.js";
import { CronJob } from "cron";
import mongo from "mongodb";
import moment from "moment";
import fs from "fs-extra";
import path from "path";

const log = require("../../log").default.namespace("presence status");

import config from "../../config";
import { doNothing } from "../../util/util";
import { timeout } from "../../util/promises";
import random from "../../modules/random/random";

import Calendarific from "../../modules/Calendarific";

import CalendarRange from "../../modules/calendar/CalendarRange";
import CalendarStatus from "../../modules/calendar/CalendarStatus";
import url from "url";
import info from "../../info";

interface DbCustomEvent {
    start: Date;
    end: Date;
    status: string;
}

export default class PresenceStatusManager {
    public client: Discord.Client;
    public database: mongo.Collection<DbCustomEvent>;

    private _calendarific: Calendarific | undefined;

    private _timeout: NodeJS.Timeout | undefined;

    public statuses: string[] = [];
    // always keep #events chronologically sorted
    public events: CalendarStatus[] = [];

    constructor(client: Discord.Client, db: mongo.Db) {
        this.client = client;
        this.database = db.collection("events");

        if (config.has("calendarific.key")) this._calendarific = new Calendarific(config.get("calendarific.key"));
    }

    private async _loadFromAPI() {
        if (!this._calendarific) return;

        const now = moment();
        // schedule next time to get events
        new CronJob(
            now.clone().set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 }).add(1, "month"),
            () => this._loadFromAPI().catch(err => log.error("Couldn't fetch holidays from API", err))
        ).start();

        log.debug("api", "Getting holidays for %d-%d...", now.year(), now.month());
        const res = await this._calendarific.holidays({
            country: "GB", year: now.year(), month: now.month() + 1,
        });
        const holidays = res.response.holidays.filter(hol => (
            !/queen/gi.test(hol.name) && // remove events like Queen's Birthday
            hol.type.some(t => /observance/gi.test(t))
        ));

        for (const holiday of holidays) {
            const start = moment(holiday.date.iso);
            const end = start.clone().add(1, "day");
            if (end.isSameOrBefore(now)) continue;

            let status: string = holiday.name;
            if (status.startsWith("Christmas")) status = "Merry " + status;
            else status = "Happy " + status;

            this.addCachedEvent(new CalendarStatus(new CalendarRange(start, end), status));
        }
    }

    async init() {
        const txt = await fs.readFile(path.join(process.cwd(), "assets/text/statuses.txt"), "utf8");
        this.statuses = txt.split("\n").filter(s => s !== "");

        this._loadFromAPI().catch(err => log.error("Couldn't fetch holidays from API", err));

        // non-blocking db call
        this.database.find({ end: { $gt: new Date() } }).on("data", c_event => {
            this.addCachedEvent(new CalendarStatus(new CalendarRange(c_event.start, c_event.end), c_event.status));
        });

        this._update().catch(doNothing);
    }

    addCachedEvent(new_ev: CalendarStatus) {
        let i = 0, ev: CalendarStatus;
        for (i = 0; ev = this.events[i], i < this.events.length; i++) {
            if (ev.range.start.isSameOrAfter(new_ev.range.start)) break;
        }

        log.debug("cache ev", "Adding %O from %s to %s to cache", new_ev.status, new_ev.range.start.toISOString(), new_ev.range.end.toISOString());
        this.events.splice(i, 0, new_ev);
    }

    async addCustomEvent(event: CalendarStatus) {
        log.debug("custom ev", "Saving %O from %s to %s to db", event.status, event.range.start.toISOString(), event.range.end.toISOString());
        await this.database.insertOne({ start: event.range.start.toDate(), end: event.range.end.toDate(), status: event.status });
        this.addCachedEvent(event);
    }

    getEvent(now: moment.Moment) {
        for (let i = 0; i < this.events.length; i++) {
            const ev = this.events[i];
            if (ev.range.isBefore(now)) this.events.shift(), i--;
            else if (ev.range.isSame(now)) return ev;
            else return undefined;
        }
    }

    private async _update() {
        // typescript doesnt understand clearTimeout() is a Node function, not a browser function
        // work around is using global.clearTimeout()
        if (this._timeout) global.clearTimeout(this._timeout);
        this._timeout = setTimeout(() => this._update(), 3 * 60000);

        if (!this.client.user) return;

        // set online, in case online status expires
        this.client.user.setStatus("online").catch(doNothing);

        // Server count
        this.client.user.setActivity(`!trixie | ${this.client.guilds.cache.size.toLocaleString("en")} servers`, { type: "WATCHING" }).catch(doNothing);
        await timeout(60000);

        // Website
        this.client.user.setActivity(`!trixie | ${info.WEBSITE ? url.parse(info.WEBSITE).hostname : "trixiebot.com"}`, { type: "PLAYING" }).catch(doNothing);
        await timeout(60000);

        // Status text
        let status: string | undefined;

        const event = this.getEvent(moment());
        if (event) {
            log.debug("set status", "Got %O from %s to %s from ev cache", event.status, event.range.start.toISOString(), event.range.end.toISOString());
            status = event.status;
        } else {
            status = random(this.statuses);
            log.debug("set status", "Got %O from quotes", status);
        }

        this.client.user.setActivity(`!trixie | ${status}`, { type: "PLAYING" }).catch(doNothing);
    }
}
