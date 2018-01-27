const EventEmitter = require("events");

class Stat extends EventEmitter {
    /**
     * A Stats Manager to keep track of a single metric
     * @param {string} name 
     */
    constructor(name) {
        super();

        this.name = name;
        /** @type {number} */
        this._value = 0;
    }

    get() {
        return this._value;
    }

    /** @param {number} value */
    set(value) {
        this._value = value;
        this.emit("change", this._value);
    }

    /** @param {number} inc */
    inc(inc = 1) {
        this._value += inc;
        this.emit("change", this._value);
    }

    /** @param {number} dec */
    dec(dec = 1) {
        this.value -= dec;
        this.emit("change", this._value);
    }
}

class StatisticsManager extends EventEmitter {
    /**
     * Creates a new Statistics manager
     * @param {string[]} statistics_names 
     */
    constructor(statistics_names) {
        super();

        /** @type {Map<string, Stat>} */
        this._map = new Map;

        /** @type {{ [stat: string]: string; }} */
        this.STATS = new Object;
        for (const name of statistics_names) {
            this.STATS[name] = name;

            const stat = new Stat(name);
            stat.addListener("change", value => this.emit("change", { name, value }));
            this._map.set(name, stat);
        }
        this.STATS = Object.freeze(this.STATS);
    }

    /** @param {string} stat */
    get(stat) {
        return this._map.get(stat);
    }

    entries() {
        return this._map.entries();
    }
}

const stat = new StatisticsManager([
    // counters
    "SERVER_COUNT",
    "LARGE_SERVERS",
    "TOTAL_MEMBERS",
    "TEXT_CHANNELS",
    "ACTIVE_WEB_USERS",
    "TOTAL_WEB_USERS",
    "SHARDS",
    "COMMANDS_EXECUTED",

    // histogram
    "API_LATENCY"
]);

module.exports = stat;
