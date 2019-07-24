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

const database = require("../../modules/db/database");

class Base {
    constructor(id, db) {
        this.id = id;
        this.db = db;
        this.$group = {
            _id: "$ts",
            value: { $sum: "$value" },
        };
        this.$project = {
            value: 1,
            ts: "$_id",
        };
    }

    get type() { return null; }

    getTS(timestamp) {
        const ts = new Date(timestamp);
        // means it will increment the value until that hour changes. So the value then represents the value at that time
        ts.setHours(ts.getHours() + 1);
        ts.setMinutes(0, 0, 0);
        return ts;
    }

    async getRangeOfAll(start, end, { channelId, userId, data }) {
        const query = {
            type: this.type,
            id: this.id,
        };
        if (start || end) {
            query.ts = {};
            if (start) query["$gte"] = start;
            if (end) query["$lt"] = end;
        }
        if (channelId) query.channelId = channelId;
        if (userId) query.userId = userId;
        if (data) query.data = data;

        const rows = await this.db.then(db => db.find(query).toArray());

        return rows.map(row => ({
            ts: row.ts,
            guildId: row.guildId,
            channelId: row.channelId,
            userId: row.userId,
            data: row.data,
            value: row.value,
        }));
    }

    async _aggregate(start, end, $match = {}, $group = {}, $project = {}) {
        const query = [];
        if (start) query.push({ ts: { $gte: start } });
        if (end) query.push({ ts: { $lt: end } });

        const rows = await this.db.then(db => db.aggregate(
            {
                $match: {
                    type: this.type,
                    id: this.id,
                    ...$match,
                    $and: query,
                },
            },
            { $group: { ...this.$group, ...$group } },
            { $project: { ...this.$project, ...$project } },
            { $project: { _id: 0 } }
        ).toArray());

        return rows.map(row => {
            delete row._id;
            return row;
        });
    }

    async getRange(start, end, guildId) {
        return await this._aggregate(start, end, { guildId });
    }

    async getRangeUser(start, end, guildId, userId) {
        return await this._aggregate(start, end, { guildId, userId });
    }

    async getRangeUsers(start, end, guildId) {
        return await this._aggregate(
            start, end, { guildId },
            {
                _id: {
                    ts: "$ts",
                    userId: "$userId",
                },
            },
            {
                ts: "$_id.ts",
                userId: "$_id.userId",
            }
        );
    }

    async getRangeChannel(start, end, guildId, channelId) {
        return await this._aggregate(start, end, { guildId, channelId });
    }

    async getRangeChannels(start, end, guildId) {
        return await this._aggregate(
            start, end, { guildId },
            {
                _id: {
                    ts: "$ts",
                    channelId: "$channelId",
                },
            },
            {
                ts: "$_id.ts",
                channelId: "$_id.channelId",
            }
        );
    }

    async getRangeChannelData(start, end, guildId, channelId, data) {
        return await this._aggregate(start, end, { guildId, channelId, data });
    }

    async getRangeChannelDatas(start, end, guildId, channelId) {
        return await this._aggregate(
            start, end, { guildId, channelId },
            {
                _id: {
                    ts: "$ts",
                    data: "$data",
                },
            },
            {
                ts: "$_id.ts",
                data: "$_id.data",
            }
        );
    }

    async getRangeData(start, end, guildId, data) {
        return await this._aggregate(start, end, { guildId, data });
    }

    async getRangeDatas(start, end, guildId) {
        return await this._aggregate(
            start, end, { guildId },
            {
                _id: {
                    ts: "$ts",
                    data: "$data",
                },
            },
            {
                ts: "$_id.ts",
                data: "$_id.data",
            }
        );
    }
}

class Histogram extends Base {
    constructor(id, db) {
        super(id, db);

        /** @type {Map<string, Map<string, number>>} */
        this.values = new Map;
        this.$group = {
            _id: "$ts",
            value: { $sum: "$value" },
            added: { $sum: "$added" },
            removed: { $sum: "$removed" },
        };
        this.$project = {
            ...this.$project,
            added: 1,
            removed: 1,
        };
    }

    get type() { return "value"; }

    async getOldVal(query) {
        let old_val;
        if (!this.values.has(query.guildId)) {
            const row = await this.getLastItemBefore(query.ts, query.guildId, query.data);
            if (row) old_val = row.value;
        } else {
            const map = this.values.get(query.guildId);
            if (!map.has(query.data || "")) {
                const row = await this.getLastItemBefore(query.ts, query.guildId, query.data);
                if (row) old_val = row.value;
            } else {
                old_val = map.get(query.data || "");
            }
        }
        return old_val;
    }

    setNewVal(query, value) {
        let map = this.values.get(query.guildId);
        if (!map) {
            map = new Map;
            this.values.set(query.guildId, map);
        }
        map.set(query.data || "", value);
    }

    async set(timestamp, guildId, data, value = 0) {
        const query = {
            ts: this.getTS(timestamp),

            type: this.type,
            id: this.id,
            guildId,
        };
        if (data) query.data = data;

        const old_val = await this.getOldVal(query, value);
        this.setNewVal(query, value);

        if (old_val) {
            const diff = value - old_val;
            if (diff > 0) {
                await this.db.then(db => db.updateOne(query, { $set: { value }, $inc: { added: diff } }, { upsert: true }));
            } else if (diff < 0) {
                await this.db.then(db => db.updateOne(query, { $set: { value }, $inc: { removed: -diff } }, { upsert: true }));
            }
        } else {
            await this.db.then(db => db.updateOne(query, { $set: { value, added: 0, removed: 0 } }, { upsert: true }));
        }
    }

    async getLastItemBefore(end, guildId, data) {
        const query = {
            type: this.type,
            id: this.id,
            guildId,
            ts: {
                $lte: end,
            },
        };
        if (data) query.data = data;

        const rows = await this.db.then(db => db.find(query)
            .sort({ ts: -1 }).limit(1)
            .project(this.$project)
            .toArray());

        if (rows[0]) {
            delete rows[0]._id;
            return rows[0];
        }
    }
}

class Counter extends Base {
    get type() { return "counter"; }

    async add(timestamp, guildId, channelId, userId, data) {
        const query = {
            ts: this.getTS(timestamp),

            type: this.type,
            id: this.id,
            guildId,
            channelId,
            userId,
        };
        if (data) query.data = data;

        await this.db.then(db => db.updateOne(query, { $inc: { value: 1 } }, { upsert: true }));
    }

    async _sum(start, end, $match = {}) {
        const query = [];
        if (start) query.push({ ts: { $gte: start } });
        if (end) query.push({ ts: { $lt: end } });

        const rows = await this.db.then(db => db.aggregate(
            {
                $match: {
                    type: this.type,
                    id: this.id,
                    ...$match,
                    $and: query,
                },
            },
            {
                $group: {
                    _id: "",
                    sum: { $sum: "$value" },
                },
            },
            {
                $project: {
                    _id: 0,
                    sum: "$value",
                },
            }
        ).toArray());

        return rows[0] ? rows[0].sum : 0;
    }

    async getSumGlobal(start, end) {
        return await this._sum(start, end);
    }

    async getSum(start, end, guildId) {
        return await this._sum(start, end, { guildId });
    }

    async getSumChannel(start, end, guildId, channelId) {
        return await this._sum(start, end, { guildId, channelId });
    }

    async getSumUser(start, end, guildId, userId) {
        return await this._sum(start, end, { guildId, userId });
    }
}

class GuildStatsManager {
    constructor() {
        this.db = database()
            .then(db => db.collection("guild_stats_new"))
            .then(async db => {
                await db.createIndex({ ts: 1 }, { expireAfterSeconds: 3600 * 24 * 92 }); // expire after 3 months
                return db;
            });

        /** @type {Map<string, Counter | Histogram>} */
        this._map = new Map;
    }

    /**
     * @param {string} id
     * @param {Counter|Histogram} cursor
     * @returns {Counter|Histogram}
     */
    _register(id, cursor) {
        this._map.set(id, cursor);
        return cursor;
    }

    /**
     * Register a new Histogram
     * @param {string} id
     * @returns {Counter}
     */
    registerCounter(id) {
        return this._register(id, new Counter(id, this.db));
    }

    /**
     * Register a new Histogram
     * @param {string} id
     * @returns {Histogram}
     */
    registerHistogram(id) {
        return this._register(id, new Histogram(id, this.db));
    }

    /**
     * Get a new Histogram
     * @param {string} id
     * @returns {Histogram|Counter}
     */
    get(id) {
        return this._map.get(id);
    }
}

module.exports = new GuildStatsManager;
