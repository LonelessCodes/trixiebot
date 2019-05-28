const database = require("../../modules/getDatabase");

/*
    
    Value:
    {
        type: string;
        id: string;
        guildId: string;
        timestamp: Date;
        value: number;
        added: number;
        removed: number;
    }

    Counter:
    {
        type: string;
        id: string;
        guildId: string;
        timestamp: Date;
        value: number;
    }
 
 */

class Base {
    constructor(id, db) {
        this.id = id;
        this.db = db;
    }

    get type() { return null; }

    async getRangeGlobal(start, end, data) {
        const query = {
            type: this.type,
            id: this.id
        };
        if (start || end) {
            query.timestamp = {};
            if (start) {
                query["$gte"] = start;
            }
            if (end) {
                query["$lt"] = end;
            }
        }
        if (data) query.data = data;

        const rows = await this.db.then(db => db.find(query).toArray());

        return rows.map(row => ({
            timestamp: row.timestamp,
            guildId: row.guildId,
            data: row.data,
            value: row.value
        }));
    }

    async getRange(start, end, guildId, merge = true) {
        if (!merge) {
            const query = {
                type: this.type,
                id: this.id,
                guildId
            };
            if (start || end) {
                query.timestamp = {};
                if (start) {
                    query.timestamp["$gte"] = start;
                }
                if (end) {
                    query.timestamp["$lt"] = end;
                }
            }

            const rows = await this.db.then(db => db.find(query).toArray());

            return rows.map(row => ({
                timestamp: row.timestamp,
                data: row.data,
                value: row.value
            }));
        } else {
            const query = [];
            if (start) {
                query.push({ timestamp: { $gte: start } });
            }
            if (end) {
                query.push({ timestamp: { $lt: end } });
            }

            const rows = await this.db.then(db => db.aggregate({
                $match: {
                    type: this.type,
                    id: this.id,
                    guildId,
                    $and: query
                }
            }, {
                $group: {
                    _id: "$timestamp",
                    value: { $sum: "$value" }
                }
            }, {
                $project: {
                    value: 1,
                    _id: 1
                }
            }).toArray());

            return rows.map(row => ({
                timestamp: row._id,
                value: row.value
            }));
        }
    }

    async getRangeData(start, end, guildId, data) {
        const query = {
            type: this.type,
            id: this.id,
            guildId
        };
        if (start || end) {
            query.timestamp = {};
            if (start) {
                query.timestamp["$gte"] = start;
            }
            if (end) {
                query.timestamp["$lt"] = end;
            }
        }
        if (data) query.data = data;

        const rows = await this.db.then(db => db.find(query).toArray());

        return rows.map(row => ({
            timestamp: row.timestamp,
            guildId: row.guildId,
            data: row.data,
            value: row.value
        }));
    }
}

class Value extends Base {
    get type() { return "value"; }

    async set(timestamp, guildId, data, value) {
        const d = new Date(timestamp);
        d.setHours(d.getHours() + 1); // means it will increment the value until that hour changes. So the value then represents the value at that time
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);

        const query = {
            type: this.type,
            id: this.id,
            guildId,
            timestamp: d
        };
        if (data) query.data = data;

        await this.db.then(db => db.updateOne(query, { $set: { value } }, { upsert: true }));
    }

    async getLastItemBefore(end, data) {
        const query = {
            type: this.type,
            id: this.id,
            timestamp: {
                $lte: end
            }
        };
        if (data) query.data = data;

        const rows = await this.db.then(db => db.find(query).sort({ "timestamp": -1 }).limit(1).toArray());

        return rows[0] ? {
            timestamp: rows[0].timestamp,
            value: rows[0].value
        } : undefined;
    }
}

class Counter extends Base {
    get type() { return "counter"; }

    async increment(timestamp, guildId, data, value = 1) {
        const d = new Date(timestamp);
        d.setHours(d.getHours() + 1); // means it will increment the value until that hour changes. So the value then represents the value at that time
        d.setMinutes(0, 0, 0);

        const query = {
            type: this.type,
            id: this.id,
            guildId,
            timestamp: d
        };
        if (data) query.data = data;

        await this.db.then(db => db.updateOne(query, { $inc: { value } }, { upsert: true }));
    }

    async decrement(timestamp, guildId, data, value = 1) {
        const d = new Date(timestamp);
        d.setHours(d.getHours() + 1); // means it will increment the value until that hour changes. So the value then represents the value at that time
        d.setMinutes(0, 0, 0);

        const query = {
            type: this.type,
            id: this.id,
            guildId,
            timestamp: d
        };
        if (data) query.data = data;

        await this.db.then(db => db.updateOne(query, { $dec: { value } }, { upsert: true }));
    }

    async getSumGlobal(start, end) {
        const query = [];
        if (start) query.push({ timestamp: { $gte: start } });
        if (end) query.push({ timestamp: { $lt: end } });

        const rows = await this.db.then(db => db.aggregate({
            $match: {
                type: this.type,
                id: this.id,
                $and: query
            }
        }, {
            $group: {
                _id: "",
                sum: { $sum: "$value" }
            }
        }, {
            $project: {
                _id: 0,
                sum: "$value"
            }
        }).toArray());

        return rows[0] ? rows[0].sum : 0;
    }

    async getSum(start, end, guildId) {
        const query = [];
        if (start) query.push({ timestamp: { $gte: start } });
        if (end) query.push({ timestamp: { $lt: end } });

        const rows = await this.db.then(db => db.aggregate({
            $match: {
                type: this.type,
                id: this.id,
                guildId,
                $and: query
            }
        }, {
            $group: {
                _id: "",
                sum: { $sum: "$value" }
            }
        }, {
            $project: {
                _id: 0,
                sum: "$value"
            }
        }).toArray());

        return rows[0] ? rows[0].sum : 0;
    }
}

class GuildStatsManager {
    constructor() {
        this.old_db = database().then(db => db.collection("guild_stats"));
        this.db = database()
            .then(db => db.collection("guild_stats_new"))
            .then(async db => {
                await db.createIndex({ timestamp: 1 }, { unique: true });
                return db;
            });

        /** @type {Map<string, Counter | Value>} */
        this._map = new Map;
    }

    /**
     * Register a new Histogram
     * @param {string} id 
     * @param {"counter"|"value"} type
     * @returns {Counter|Value}
     */
    register(id, type) {
        if (type === "counter") {
            const cursor = new Counter(id, this.db);
            this._map.set(id, cursor);
            return cursor;
        } else {
            const cursor = new Value(id, this.db);
            this._map.set(id, cursor);
            return cursor;
        }
    }

    get(id) {
        return this._map.get(id);
    }
}

module.exports = new GuildStatsManager;