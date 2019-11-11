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

const { isPlainObject } = require("../../util/util");
const { CronJob } = require("cron");

const DEFAULTS = {
    maxSize: 500,
    ttl: 0,
    indexes: {},
};

class DocumentMapCache {
    /**
     * Creates a new manager for caching database documents
     * @param {any} collection The database collection to get documents from
     * @param {string} keyName The document property to get docs from
     * @param {Object} [opts] The indexes for the collection
     * @param {Object} [opts.indexes] The indexes for the collection
     * @param {number} [opts.ttl] Time to life before cleanup of a document in seconds (in cache)
     * @param {number} [opts.maxSize] Maximum number of docs in cache
     */
    constructor(collection, keyName, opts = {}) {
        opts = Object.assign({}, DEFAULTS, opts);

        if (!opts.indexes[keyName]) opts.indexes[keyName] = { unique: true };
        else if (!opts.indexes[keyName].unique)
            throw new Error("The index string must be a part of the databaseIndexes object and must be unique!");

        this.db = collection;
        this.keyName = keyName;

        this.indexes = opts.indexes[keyName];
        for (const index in this.indexes) {
            this.db.createIndex({ [index]: 1 }, this.indexes[index]);
        }

        this.ttl = opts.ttl * 1000;
        this.maxSize = opts.maxSize;

        /** @type {Map<string, CronJob>} */
        this._expire = new Map;
        /** @type {Map<string, Config>} */
        this._documents = new Map;
        /** @type {Map<string, number>} */
        this._ttl = new Map;
    }

    checkIndexes(key) {
        if (!this._documents.has(key)) return;

        const doc = this._documents.get(key);
        for (const index in this.indexes) {
            const conf = this.indexes[index];
            if (typeof conf.expireAfterSeconds === "number") {
                const propTime = doc[index];
                if (typeof propTime !== "number") continue;

                if (this._expire.has(doc[this.keyName]))
                    this._expire.get(doc[this.keyName]).stop();

                if (propTime.getTime() + (conf.expireAfterSeconds * 1000) > Date.now()) {
                    this._expire.set(doc[this.keyName], new CronJob(
                        new Date(propTime.getTime() + (conf.expireAfterSeconds * 1000)),
                        () => this.delete(doc[this.keyName]),
                        null,
                        true
                    ));
                } else {
                    this.delete(doc[this.keyName]);
                }
            }
        }
    }

    _deleteInternal(key) {
        if (this._documents.has(key))
            this._documents.delete(key);

        if (this._expire.has(key)) {
            this._expire.get(key).stop();
            this._expire.delete(key);
        }

        if (this._ttl.has(key)) {
            clearTimeout(this._ttl.get(key));
            this._ttl.delete(key);
        }
    }

    _setTTLTimeout(key) {
        if (this.ttl <= 0) return;

        if (this._ttl.has(key)) clearTimeout(this._ttl.get(key));

        const timeout = setTimeout(() => this._deleteInternal(key), this.ttl);
        this._ttl.set(key, timeout);
    }

    _setInternal(key, newdoc) {
        const isNew = !this._documents.has(key);
        if (isNew && this.maxSize > 0 && this._documents.size >= this.maxSize) {
            const [firstKey] = this._documents.entries().next().value;
            this._deleteInternal(firstKey);
        }

        this._documents.set(key, newdoc);
        this._setTTLTimeout(key);

        return isNew;
    }

    _getInternal(key) {
        const doc = this._documents.get(key);

        if (doc) this._setTTLTimeout(key);

        return doc;
    }

    async delete(key) {
        this._deleteInternal(key);
        await this.db.deleteOne({ [this.keyName]: key });
    }

    async get(key) {
        let doc;

        if (this._documents.has(key)) doc = this._getInternal(key);
        else {
            doc = await this.db.findOne({ [this.keyName]: key });
            this._setInternal(key, doc);
        }

        return doc;
    }

    async has(key) {
        if (this._documents.has(key)) return !!this._getInternal(key);
        else {
            const doc = await this.db.findOne({ [this.keyName]: key });
            this._setInternal(key, doc);
            return !!doc;
        }
    }

    async mget(keys = []) {
        const docs = {};
        const get_keys = [];

        for (let key of keys) {
            if (this._documents.has(key)) docs[key] = this._getInternal(key);
            else get_keys.push(key);
        }

        if (get_keys.length > 0) {
            const rows = await this.db.find({ $or: get_keys.map(key => ({ [this.keyName]: key })) });
            for (let row of rows) {
                docs[row[this.keyName]] = row;
                this._setInternal(row[this.keyName], row);
            }
        }

        return docs;
    }

    async mhas(keys = []) {
        const get_keys = [];

        for (let key of keys) {
            if (this._documents.has(key)) if (!this._getInternal(key)) return false;
            else get_keys.push(key);
        }

        if (get_keys.length > 0) {
            const rows = await this.db.find({ $or: get_keys.map(key => ({ [this.keyName]: key })) });
            for (let row of rows)
                this._setInternal(row[this.keyName], row);

            if (rows.length !== new Set(get_keys).size) return false;
        }

        return true;
    }

    async set(key, values = {}) {
        if (!isPlainObject(values)) throw new Error("Values is not of type Object or typeof Document");

        const newdoc = Object.assign({}, values, { [this.keyName]: key });
        const isNew = this._setInternal(key, newdoc);
        if (isNew) await this.db.updateOne({ [this.keyName]: key }, { $set: newdoc }, { upsert: true });
        else await this.db.replaceOne({ [this.keyName]: key }, newdoc);

        this.checkIndexes(key);
    }

    async update(key, values = {}) {
        if (!isPlainObject(values)) throw new Error("Values is not of type Object or typeof Document");
        if (this.keyName in values) throw new Error("Cannot update mapped key");

        const isNew = !this._documents.has(key);
        if (isNew && this.maxSize > 0 && this._documents.size >= this.maxSize) {
            const [firstKey] = this._documents.entries().next().value;
            this._deleteInternal(firstKey);
        }

        let doc;
        if (isNew) {
            const in_db = await this.db.findOne({ [this.keyName]: key });
            if (!in_db) return;

            doc = Object.assign(in_db, values);
        } else {
            doc = this._getInternal(key);
        }

        this._documents.set(key, doc);
        this._setTTLTimeout(key);

        await this.db.updateOne({ [this.keyName]: key }, { $set: values });

        this.checkIndexes(key);
    }
}

module.exports = DocumentMapCache;
