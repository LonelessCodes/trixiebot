const { isPlainObject } = require("../modules/util");
const { CronJob } = require("cron");

// DatabaseCache does not scale well now. Memory usage goes up linear to database size
// Currently speed is of greater priority than scalability. Will have to change that 
// when bot gets bigger should limit cache to 1000 most active queries or so 

const DEFAULTS = {
    maxSize: 500,
    ttl: 0,
};

class DocumentCache {
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

        this.opts = Object.assign({}, DEFAULTS, opts);

        /** @type {Map<string, CronJob>} */
        this._expire = new Map;
        /** @type {Map<string, Config>} */
        this._documents = new Map;
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

    _setInternal(key, newdoc) {
        const isNew = !this._documents.has(key);
        if (isNew && this._documents.size >= this.opts.maxSize) {
            const [firstKey,] = this._documents.entries().next().value;
            this._documents.delete(firstKey);

            if (this._expire.has(firstKey)) {
                this._expire.get(firstKey).stop();
                this._expire.delete(firstKey);
            }
        }

        this._documents.set(key, newdoc);

        return isNew;
    }

    async delete(key) {
        if (this._documents.has(key))
            this._documents.delete(key);

        if (this._expire.has(key)) {
            this._expire.get(key).stop();
            this._expire.delete(key);
        }
        await this.db.deleteOne({ [this.keyName]: key });
    }

    async get(key) {
        let doc;

        if (this._documents.has(key)) doc = this._documents.get(key);
        else {
            doc = await this.db.findOne({ [this.keyName]: key });
            this._setInternal(key, doc);
        }

        return doc;
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

module.exports = DocumentCache;
