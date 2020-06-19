/*
 * Copyright (C) 2020 Christian Schäfer / Loneless
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

import { Db, Collection } from "mongodb";
import events from "events";

import ipc from "../../modules/concurrency/ipc";
import { doNothing } from "../../util/util";

export default class BotStatsManager extends events.EventEmitter {
    private _db: Collection<{ name: string; value: number; }>;
    private _bot: Map<string, number>;
    private _web: Map<string, number>;

    constructor(db: Db) {
        super();

        this._db = db.collection("bot_stats");

        this._bot = new Map();
        this._web = new Map();

        ipc.answer("getBotStats", () => {
            const json = this.toJSON();
            json.UPTIME = Math.floor(process.uptime() / 60);

            return {
                success: true,
                stats: json,
            };
        });

        this._awaitWebStats();
    }

    private _awaitWebStats() {
        ipc.awaitAnswer("getWebStats")
            .then(({ stats }: { stats: { [key: string]: number } }) => {
                for (const name in stats) this._web.set(name, stats[name]);
            })
            .catch(doNothing);

        setTimeout(() => this._awaitWebStats(), 10000);
    }

    async load(id: string): Promise<void> {
        if (this._bot.has(id)) return;

        const res = await this._db.findOne({ name: id });
        if (!res) return;

        this._bot.set(res.name, res.value);
    }

    has(id: string): boolean {
        return this._bot.has(id) || this._web.has(id);
    }

    get(id: string): number {
        return this._bot.get(id) || this._web.get(id) || 0;
    }

    set(id: string, value: number, save_to_database: boolean = false): void {
        this._bot.set(id, value);
        if (save_to_database) this._db.updateOne({ name: id }, { $set: { value } }, { upsert: true }).catch(doNothing);
    }

    inc(id: string, inc: number = 1, save_to_database: boolean = false): void {
        const val = this.get(id);
        this.set(id, val + inc, save_to_database);
    }

    dec(id: string, dec: number = 1, save_to_database: boolean = false): void {
        this.inc(id, -dec, save_to_database);
    }

    toJSON(): { [key: string]: number; } {
        const json: { [key: string]: number; } = {};
        for (const [name, value] of this._bot) {
            json[name] = value;
        }
        return json;
    }
}

export const COMMANDS_EXECUTED = "COMMANDS_EXECUTED";
export const MESSAGES_TODAY = "MESSAGES_TODAY";
export const TOTAL_SERVERS = "TOTAL_SERVERS";
export const LARGE_SERVERS = "LARGE_SERVERS";
export const TOTAL_USERS = "TOTAL_USERS";
export const TEXT_CHANNELS = "TEXT_CHANNELS";

export const ACTIVE_WEB_USERS = "ACTIVE_WEB_USERS";
export const TOTAL_WEB_USERS = "TOTAL_WEB_USERS";
