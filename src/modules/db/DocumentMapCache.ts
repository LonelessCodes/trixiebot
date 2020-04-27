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

import { doNothing } from "../../util/util";
import { Except } from "type-fest";
import { CronJob } from "cron";
import { Collection, IndexOptions } from "mongodb";

export type IndexSpec<Keys extends string | number | symbol> = { [Key in Keys]?: IndexOptions };

export interface DocumentMapCacheOptions<Keys extends string | number | symbol> {
    indexes?: IndexSpec<Keys>;
    ttl?: number;
    maxSize?: number;
}

const DEFAULTS: DocumentMapCacheOptions<"_id"> = {
    maxSize: 500,
    ttl: 0,
    indexes: {},
};

/**
 * Creates a new manager for caching database documents
 */
export default class DocumentMapCache<
    KeyName extends string,
    KeyType extends string | number,
    TSchema extends { [Key in KeyName]: KeyType }
> {
    public readonly db: Collection<TSchema>;
    public readonly keyName: keyof TSchema;
    public readonly indexes: IndexSpec<keyof TSchema>;
    public readonly ttl: number;
    public readonly maxSize: number;

    private _expire: Map<KeyType, CronJob> = new Map();
    private _documents: Map<KeyType, TSchema> = new Map();
    private _ttl: Map<KeyType, NodeJS.Timeout> = new Map();

    constructor(collection: Collection<TSchema>, keyName: KeyName, _opts: DocumentMapCacheOptions<keyof TSchema> = {}) {
        const opts = { ...DEFAULTS, ..._opts } as Required<DocumentMapCacheOptions<keyof TSchema>>;

        if (!opts.indexes[keyName]) opts.indexes[keyName] = { unique: true };
        else if (!opts.indexes[keyName]!.unique)
            throw new Error("The index string must be a part of the databaseIndexes object and must be unique!");

        this.db = collection;
        this.keyName = keyName;

        this.indexes = opts.indexes;
        for (const index in this.indexes) {
            this.db.createIndex({ [index]: 1 }, this.indexes[index]).catch(doNothing);
        }

        this.ttl = opts.ttl * 1000;
        this.maxSize = opts.maxSize;
    }

    private checkIndexes(key: KeyType) {
        const doc = this._documents.get(key);
        if (!doc) return;

        for (const index in this.indexes) {
            const conf = this.indexes[index]!;
            if (typeof conf.expireAfterSeconds === "number") {
                const propTime = doc[index];
                if (!(propTime instanceof Date)) continue;

                if (this._expire.has(doc[this.keyName])) this._expire.get(doc[this.keyName])!.stop();

                const expireAfterMs = conf.expireAfterSeconds * 1000;
                if (propTime.getTime() + expireAfterMs > Date.now()) {
                    this._expire.set(
                        doc[this.keyName],
                        new CronJob(
                            new Date(propTime.getTime() + expireAfterMs),
                            () => this.delete(doc[this.keyName]),
                            null,
                            true
                        )
                    );
                } else {
                    this._deleteInternal(doc[this.keyName]);
                }
            }
        }
    }

    private _deleteInternal(key: KeyType) {
        if (this._documents.has(key)) this._documents.delete(key);

        if (this._expire.has(key)) {
            this._expire.get(key)!.stop();
            this._expire.delete(key);
        }

        if (this._ttl.has(key)) {
            clearTimeout(this._ttl.get(key)!);
            this._ttl.delete(key);
        }
    }

    private _setTTLTimeout(key: KeyType) {
        if (this.ttl <= 0) return;

        if (this._ttl.has(key)) clearTimeout(this._ttl.get(key)!);

        const timeout = setTimeout(() => this._deleteInternal(key), this.ttl);
        this._ttl.set(key, timeout);
    }

    private _setInternal(key: KeyType, newdoc: TSchema) {
        const isNewCache = !this._documents.has(key);
        if (isNewCache && this.maxSize > 0 && this._documents.size >= this.maxSize) {
            const [firstKey] = this._documents.entries().next().value;
            this._deleteInternal(firstKey);
        }

        this._documents.set(key, newdoc);
        this._setTTLTimeout(key);

        return isNewCache;
    }

    private _getInternal(key: KeyType): TSchema | null {
        const doc = this._documents.get(key);
        if (!doc) return null;

        this._setTTLTimeout(key);

        return doc;
    }

    async delete(key: KeyType) {
        this._deleteInternal(key);
        await this.db.deleteOne({ [this.keyName]: key });
    }

    async get(key: KeyType): Promise<TSchema | null> {
        let doc: TSchema | null = null;

        if (this._documents.has(key)) doc = this._getInternal(key);
        else {
            doc = await this.db.findOne({ [this.keyName]: key });
            if (doc) this._setInternal(key, doc);
        }

        return doc ? { ...doc } : null;
    }

    async has(key: KeyType) {
        if (this._documents.has(key)) return !!this._getInternal(key);

        const doc = await this.db.findOne({ [this.keyName]: key });
        if (doc) this._setInternal(key, doc);
        return !!doc;
    }

    async mget(keys: KeyType[] = []): Promise<{ [Key in KeyType]?: TSchema }> {
        const docs: { [Key in KeyType]?: TSchema } = {};
        const get_keys = [];

        for (const key of keys) {
            if (this._documents.has(key)) docs[key] = this._getInternal(key)!;
            else get_keys.push(key);
        }

        if (get_keys.length > 0) {
            const rows = await this.db.find({ $or: get_keys.map(key => ({ [this.keyName]: key })) });
            for (const row of rows) {
                docs[row[this.keyName] as KeyType] = { ...row };
                this._setInternal(row[this.keyName] as KeyType, row);
            }
        }

        return docs;
    }

    async mhas(keys: KeyType[] = []): Promise<boolean> {
        const get_keys: KeyType[] = [];

        for (const key of keys) {
            if (this._documents.has(key))
                if (!this._getInternal(key)) return false;
                else get_keys.push(key);
        }

        if (get_keys.length > 0) {
            const rows = await this.db.find({ $or: get_keys.map(key => ({ [this.keyName]: key })) });
            for (const row of rows) this._setInternal(row[this.keyName], row);

            if (rows.length !== new Set(get_keys).size) return false;
        }

        return true;
    }

    async set(key: KeyType, values: Except<TSchema, KeyName>) {
        const newdoc = { ...values, [this.keyName]: key } as TSchema;
        this._setInternal(key, newdoc);
        await this.db.replaceOne({ [this.keyName]: key }, newdoc, { upsert: true });

        this.checkIndexes(key);
    }
}

// interface Doc {
//     _id: string;
//     hello: string;
// }
// // eslint-disable-next-line no-new
// new DocumentMapCache<"_id", string, Doc>({} as Collection, "_id", { indexes: { hello: { unique: true } } });
