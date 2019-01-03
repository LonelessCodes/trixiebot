const ipc = require("./ipc");
const EventEmitter = require("events");
const database = require("../modules/getDatabase");

class Stat extends EventEmitter {
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

class BotStats extends EventEmitter {
    constructor() {
        super();

        this.db = database().then(db => db.collection("bot_stats"));

        /** @type {Map<string, Stat>} */
        this._map = new Map;

        this.broadcastStats();
    }

    async broadcastStats() {
        await ipc.promiseStart;

        ipc.answer("getBotStats", async () => {
            const json = this.toJSON();
            json.UPTIME = Math.floor(process.uptime() / 60);

            return {
                success: true,
                stats: json
            };
        });
    }

    async register(id, saveToDatabase = false) {
        if (this._map.has(id)) return this._map.get(id);

        const stat = new Stat(id);
        stat.on("change", val => {
            this.emit("change", { name: id, value: val });
            if (saveToDatabase) this.db.then(db => db.updateOne({ name: id }, { $set: { value: val } }, { upsert: true }));
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

class WebStats extends EventEmitter {
    constructor() {
        super();

        this.NAME = Object.freeze({
            "ACTIVE_WEB_USERS": "ACTIVE_WEB_USERS",
            "TOTAL_WEB_USERS": "TOTAL_WEB_USERS"
        });

        /** @type {Map<string, Stat>} */
        this._map = new Map;

        for (const name in this.NAME) {
            const stat = new Stat;
            stat.on("change", value => this.emit("change", { name, value }));
            this._map.set(name, stat);
        }

        this.awaitStats();
    }

    async awaitStats() {
        if (!ipc.started) await ipc.promiseStart;

        ipc.awaitAnswer("getWebStats").then(({ stats }) => {
            for (const name in stats) {
                if (!this.has(name)) continue;
                this.get(name).set(stats[name]);
            }
        }).catch(() => { });

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
    web: new WebStats,
    bot: new BotStats
};