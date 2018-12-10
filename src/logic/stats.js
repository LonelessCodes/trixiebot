const ipc = require("./ipc");
const EventEmitter = require("events");

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

    /** @param {number} value */
    set(value) {
        this._tmp = value - this._value;
        this._value = value;
        this.emit("change", this._value);
    }

    /** @param {number} inc */
    inc(inc = 1) {
        this._tmp += inc;
        this._value += inc;
        this.emit("change", this._value);
    }

    /** @param {number} dec */
    dec(dec = 1) {
        this._tmp -= dec;
        this._value -= dec;
        this.emit("change", this._value);
    }
}

class BotStats extends EventEmitter {
    constructor() {
        super();

        this.NAME = Object.freeze({
            "TOTAL_SERVERS": "TOTAL_SERVERS",
            "LARGE_SERVERS": "LARGE_SERVERS",
            "TEXT_CHANNELS": "TEXT_CHANNELS",
            "TOTAL_USERS": "TOTAL_USERS",
            "SHARDS": "SHARDS",
            "COMMANDS_EXECUTED": "COMMANDS_EXECUTED",
            "MESSAGES_TODAY": "MESSAGES_TODAY"
        });

        /** @type {Map<string, Stat>} */
        this._map = new Map;

        for (const name in this.NAME) {
            const stat = new Stat;
            stat.on("change", value => this.emit("change", { name, value }));
            this._map.set(name, stat);
        }

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