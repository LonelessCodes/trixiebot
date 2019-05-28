const { isPlainObject } = require("../modules/util");
const { CronJob } = require("cron");

// DatabaseCache does not scale well now. Memory usage goes up linear to database size
// Currently speed is of greater priority than scalability. Will have to change that 
// when bot gets bigger should limit cache to 1000 most active queries or so 

const DEFAULTS = {
    maxSize: 500,
    ttl: 0,
};

class DocumentMapCache {
    /**
     * Creates a new manager for caching database documents
     * @param {*} collection The database collection to get documents from
     * @param {string} keyName The document property to get docs from
     * @param {{ [x: string]: any }} databaseIndexes The indexes for the collection
     */
    constructor(collection, keyName, databaseIndexes = {}, opts = {}) {
        if (!databaseIndexes[keyName] || !databaseIndexes[keyName].unique) {
            throw new Error("The index string must be a part of the databaseIndexes object and must be unique!");
        }

        this.db = collection;
        this.keyName = keyName;

        this.indexes = databaseIndexes;
        for (const index in databaseIndexes) {
            this.db.createIndex({ [index]: 1 }, databaseIndexes[index]);
        }

        opts = Object.assign({}, DEFAULTS, opts);
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
            const [firstKey,] = this._documents.entries().next().value;
            this._deleteInternal(firstKey);
        }

        this._documents.set(key, newdoc);
        this._setInternal(key);

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

    async set(key, values = {}) {
        if (!isPlainObject(values)) throw new Error("Values is not of type Object or typeof Document");

        const newdoc = Object.assign({}, values, { [this.keyName]: key });
        const isNew = this._setInternal(key, newdoc);
        if (isNew) await this.db.updateOne({ [this.keyName]: key }, { $set: newdoc }, { upsert: true });
        else await this.db.replaceOne({ [this.keyName]: key }, newdoc);

        this.checkIndexes(key);
    }
}

module.exports = DocumentMapCache;
