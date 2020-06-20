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

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { SetRequired, SetOptional } from "type-fest";
import { Collection, Db, ObjectId, FilterQuery } from "mongodb";
import { doNothing } from "../../util/util";

interface GetRangeForAllOptions {
    channelId: string;
    userId: string;
    data: any;
}

interface GuildStatsDocument {
    _id: ObjectId;
    type: string;
    id: string;

    ts: Date;
    guildId: string;
    channelId?: string;
    userId?: string;
    data?: any;
    value: number;
    added?: number;
    removed?: number;
}

abstract class Base {
    id: string;
    db: Collection<GuildStatsDocument>;

    $group = {
        _id: "$ts",
        value: { $sum: "$value" },
    };
    $project = {
        value: 1,
        ts: "$_id",
    };

    abstract readonly type: string;

    constructor(id: string, db: Collection<GuildStatsDocument>) {
        this.id = id;
        this.db = db;
    }

    getTS(timestamp: Date | number) {
        const ts = new Date(timestamp);
        // means it will increment the value until that hour changes. So the value then represents the value at that time
        ts.setHours(ts.getHours() + 1);
        ts.setMinutes(0, 0, 0);
        return ts;
    }

    async getRangeOfAll(start: Date, end: Date, { channelId, userId, data }: GetRangeForAllOptions) {
        const query: FilterQuery<GuildStatsDocument> = {
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

        const rows = await this.db.find(query).toArray();

        return rows.map(row => ({
            ts: row.ts,
            guildId: row.guildId,
            channelId: row.channelId,
            userId: row.userId,
            data: row.data,
            value: row.value,
        }));
    }

    async _aggregate(start: Date, end: Date, $match: Record<string, any> = {}, $group: Record<string, any> = {}, $project: Record<string, any> = {}) {
        const query: Record<string, any>[] = [];
        if (start) query.push({ ts: { $gte: start } });
        if (end) query.push({ ts: { $lt: end } });

        const rows = await this.db.aggregate([
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
            { $project: { _id: 0 } },
        ]).toArray();

        return rows.map(row => {
            delete row._id;
            return row;
        });
    }

    async getRange(start: Date, end: Date, guildId: string) {
        return await this._aggregate(start, end, { guildId });
    }

    async getRangeUser(start: Date, end: Date, guildId: string, userId: string) {
        return await this._aggregate(start, end, { guildId, userId });
    }

    async getRangeUsers(start: Date, end: Date, guildId: string) {
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

    async getRangeChannel(start: Date, end: Date, guildId: string, channelId: string) {
        return await this._aggregate(start, end, { guildId, channelId });
    }

    async getRangeChannels(start: Date, end: Date, guildId: string) {
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

    async getRangeData(start: Date, end: Date, guildId: string, data: any) {
        return await this._aggregate(start, end, { guildId, data });
    }

    async getRangeDatas(start: Date, end: Date, guildId: string) {
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

    async getRangeChannelData(start: Date, end: Date, guildId: string, channelId: string, data: any) {
        return await this._aggregate(start, end, { guildId, channelId, data });
    }

    async getRangeChannelDatas(start: Date, end: Date, guildId: string, channelId: string) {
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
}

export class Histogram extends Base {
    readonly type = "value";

    values: Map<string, Map<string, number>> = new Map();
    $group = {
        _id: "$ts",
        value: { $sum: "$value" },
        added: { $sum: "$added" },
        removed: { $sum: "$removed" },
    };
    $project = {
        value: 1,
        ts: "$_id",
        added: 1,
        removed: 1,
    };

    async getOldVal(query: SetRequired<Partial<GuildStatsDocument>, "guildId" | "ts">) {
        let old_val: number | undefined;
        const map = this.values.get(query.guildId);
        if (!map) {
            const row = await this.getLastItemBefore(query.ts, query.guildId, query.data);
            if (row) old_val = row.value;
        } else {
            const val = map.get(query.data || "");
            if (typeof val === "undefined") {
                const row = await this.getLastItemBefore(query.ts, query.guildId, query.data);
                if (row) old_val = row.value;
            } else {
                old_val = val;
            }
        }
        return old_val;
    }

    setNewVal(query: SetRequired<Partial<GuildStatsDocument>, "guildId">, value: number) {
        let map = this.values.get(query.guildId);
        if (!map) {
            map = new Map();
            this.values.set(query.guildId, map);
        }
        map.set(query.data || "", value);
    }

    async set(timestamp: number | Date, guildId: string, data: any, value: number = 0) {
        const query: SetOptional<GuildStatsDocument, "_id" | "value"> = {
            ts: this.getTS(timestamp),

            type: this.type,
            id: this.id,
            guildId,
        };
        if (data) query.data = data;

        const old_val = await this.getOldVal(query);
        this.setNewVal(query, value);

        if (old_val) {
            const diff = value - old_val;
            if (diff > 0) {
                await this.db.updateOne(query, { $set: { value }, $inc: { added: diff } }, { upsert: true });
            } else if (diff < 0) {
                await this.db.updateOne(query, { $set: { value }, $inc: { removed: -diff } }, { upsert: true });
            }
        } else {
            await this.db.updateOne(query, { $set: { value, added: 0, removed: 0 } }, { upsert: true });
        }
    }

    async getLastItemBefore(end: Date, guildId: string, data: any) {
        const query: FilterQuery<GuildStatsDocument> = {
            type: this.type,
            id: this.id,
            guildId,
            ts: {
                $lte: end,
            },
        };
        if (data) query.data = data;

        const rows = await this.db.find(query)
            .sort({ ts: -1 })
            .limit(1)
            .project(this.$project)
            .toArray();

        if (rows[0]) {
            delete rows[0]._id;
            return rows[0];
        }
    }
}

class Counter extends Base {
    readonly type = "counter";

    async add(timestamp: number | Date, guildId: string, channelId: string, userId: string, data: any) {
        const query: FilterQuery<GuildStatsDocument> = {
            ts: this.getTS(timestamp),

            type: this.type,
            id: this.id,
            guildId,
            channelId,
            userId,
        };
        if (data) query.data = data;

        await this.db.updateOne(query, { $inc: { value: 1 } }, { upsert: true });
    }

    async _sum(start: Date | undefined, end: Date | undefined, $match = {}) {
        const query: FilterQuery<GuildStatsDocument>[] = [];
        if (start) query.push({ ts: { $gte: start } });
        if (end) query.push({ ts: { $lt: end } });

        const rows = await this.db.aggregate([
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
            },
        ]).toArray() as unknown as [{ sum: number }];

        return rows[0] ? rows[0].sum : 0;
    }

    async getSumGlobal(start: Date | undefined, end: Date | undefined) {
        return await this._sum(start, end);
    }

    async getSum(start: Date | undefined, end: Date | undefined, guildId: string) {
        return await this._sum(start, end, { guildId });
    }

    async getSumChannel(start: Date | undefined, end: Date | undefined, guildId: string, channelId: string) {
        return await this._sum(start, end, { guildId, channelId });
    }

    async getSumUser(start: Date | undefined, end: Date | undefined, guildId: string, userId: string) {
        return await this._sum(start, end, { guildId, userId });
    }
}

export default class GuildStatsManager {
    db: Collection<GuildStatsDocument>;

    private _map: Map<string, Base> = new Map();

    constructor(db: Db) {
        this.db = db.collection("guild_stats_new");
        this.db.createIndex({ ts: 1 }, { expireAfterSeconds: 3600 * 24 * 92 }).catch(doNothing); // expire after 3 months
    }

    private _register<T extends Base>(id: string, cursor: T): T {
        this._map.set(id, cursor);
        return cursor;
    }

    /**
     * Register a new Histogram
     * @param {string} id
     * @returns {Counter}
     */
    registerCounter(id: string): Counter {
        return this._register(id, new Counter(id, this.db));
    }

    /**
     * Register a new Histogram
     * @param {string} id
     * @returns {Histogram}
     */
    registerHistogram(id: string): Histogram {
        return this._register(id, new Histogram(id, this.db));
    }

    /**
     * Get a new Histogram
     * @param {string} id
     * @returns {Base}
     */
    get(id: string): Base | undefined {
        return this._map.get(id);
    }
}
