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

const ipc = require("./concurrency/ipc");
const { doNothing } = require("../util/util");
const events = require("events");
const database = require("./db/database").default;

class Stat extends events.EventEmitter {
    /**
     * A Stats Manager to keep track of a single metric
     */
    constructor() {
        super();

        /** @type {number} */
        this._value = 0;
        /** @type {number} */
        this._tmp = 0;
    }

    get() {
        return this._value;
    }

    get value() {
        return this._value;
    }

    set value(val) {
        this._value = val;
        this.emit("change", this._value);
    }

    /** @param {number} value */
    set(value) {
        this._tmp = value - this._value;
        this.value = value;
    }

    /** @param {number} inc */
    inc(inc = 1) {
        this._tmp += inc;
        this.value += inc;
    }

    /** @param {number} dec */
    dec(dec = 1) {
        this._tmp -= dec;
        this.value -= dec;
    }
}

class BotStats extends events.EventEmitter {
    constructor() {
        super();

        this.db = database().then(db => db.collection("bot_stats"));

        /** @type {Map<string, Stat>} */
        this._map = new Map();

        this.broadcastStats();
    }

    broadcastStats() {
        ipc.answer("getBotStats", () => {
            const json = this.toJSON();
            json.UPTIME = Math.floor(process.uptime() / 60);

            return {
                success: true,
                stats: json,
            };
        });
    }

    async register(id, saveToDatabase = false) {
        let stat = this._map.get(id);
        if (stat) return stat;

        stat = new Stat();
        stat.on("change", val => {
            this.emit("change", { name: id, value: val });
            if (saveToDatabase) this.db.then(db => db.updateOne({ name: id }, { $set: { value: val } }, { upsert: true })).catch(doNothing);
        });
        this._map.set(id, stat);

        if (saveToDatabase) {
            const entry = await this.db.then(db => db.findOne({ name: id }));
            if (entry) stat.set(entry.value);
        }

        return stat;
    }

    has(id) {
        return this._map.has(id);
    }

    get(id) {
        return this._map.get(id);
    }

    toJSON() {
        const json = {};
        for (const [name, stat] of this._map) {
            json[name] = stat.get();
        }
        return json;
    }
}

class WebStats extends events.EventEmitter {
    constructor() {
        super();

        this.NAME = Object.freeze({
            ACTIVE_WEB_USERS: "ACTIVE_WEB_USERS",
            TOTAL_WEB_USERS: "TOTAL_WEB_USERS",
        });

        /** @type {Map<string, Stat>} */
        this._map = new Map();

        for (const name in this.NAME) {
            const stat = new Stat();
            stat.on("change", value => this.emit("change", { name, value }));
            this._map.set(name, stat);
        }

        this.awaitStats();
    }

    awaitStats() {
        ipc.awaitAnswer("getWebStats")
            .then(({ stats }) => {
                for (const name in stats) {
                    const stat = this.get(name);
                    if (!stat) continue;
                    stat.set(stats[name]);
                }
            })
            .catch(doNothing);

        setTimeout(() => this.awaitStats(), 10000);
    }

    has(name) {
        return this._map.has(name);
    }

    get(name) {
        return this._map.get(name);
    }

    toJSON() {
        const json = {};
        for (const [name, stat] of this._map) {
            json[name] = stat.get();
        }
        return json;
    }
}

module.exports = {
    web: new WebStats(),
    bot: new BotStats(),
};
