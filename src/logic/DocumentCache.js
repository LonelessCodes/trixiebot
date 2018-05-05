const { isPlainObject } = require("../modules/util");
const { CronJob } = require("cron");

// DatabaseCache does not scale well now. Memory usage goes up linear to database size
// Currently speed is of greater priority than scalability. Will have to change that 
// when bot gets bigger should limit cache to 1000 most active queries or so 

class Document {
    constructor(doc) {
        doc = Object.setPrototypeOf(doc, Document.prototype);
        return doc;
    }
}

class DocumentCache {
    /**
     * Creates a new manager for caching database documents
     * @param {*} collection The database collection to get documents from
     * @param {string} index The document property to get docs from
     * @param {{ [x: string]: any }} databaseIndexes The indexes for the collection
     */
    constructor(collection, index, databaseIndexes = {}) {
        if (!databaseIndexes[index] || !databaseIndexes[index].unique) {
            throw new Error("The index string must be a part of the databaseIndexes object and must be unique!");
        }

        this.db = collection;
        this.index = index;

        this.indexes = databaseIndexes;
        for (const index in databaseIndexes) {
            collection.createIndex(index, databaseIndexes[index]);
        }

        /** @type {Map<string, CronJob>} */
        this._expire = new Map;
        /** @type {Map<string, Config>} */
        this._documents = new Map;
        this.initial_load = new Promise((resolve, reject) => {
            const stream = this.db.find({});
            stream.addListener("data", doc => {
                this._documents.set(doc[this.index], new Document(doc));
                this.checkIndexes(doc[this.index]);
            });
            stream.once("end", () => resolve());
            stream.once("error", err => reject(err));
        });
    }

    checkIndexes(index) {
        if (!this._documents.has(index)) return;

        const doc = this._documents.get(index);
        for (const index in this.indexes) {
            const conf = this.indexes[index];
            if (typeof conf.expireAfterSeconds === "number") {
                const propTime = doc[index];
                if (typeof propTime !== "number") continue;

                if (propTime.getTime() + conf.expireAfterSeconds > 0) {
                    this._expire.set(doc[this.index], new CronJob(
                        new Date(propTime.getTime() + conf.expireAfterSeconds),
                        () => this.delete(doc[this.index]),
                        null,
                        true
                    ));
                } else {
                    this.delete(doc[this.index]);
                }
            }
        }
    }

    async delete(index) {
        // will fire instantly if loaded already, or wait 
        // till all documents are initially loaded into memory
        await this.initial_load;

        this._documents.delete(index);
        if (this._expire.has(index)) {
            this._expire.get(index).stop();
            this._expire.delete(index);
        }
        await this.db.deleteOne({ [this.index]: index });
    }

    async get(index) {
        // will fire instantly if loaded already, or wait 
        // till all documents are initially loaded into memory
        await this.initial_load;
        let doc;
        if (this._documents.has(index)) doc = this._documents.get(index);

        return doc;
    }

    async set(index, values = {}) {
        if (!(values instanceof Document) && !isPlainObject(values)) throw new Error("Values is not of type Object or typeof Document");

        await this.initial_load;
        if (!this._documents.has(index)) {
            const newdoc = new Document(Object.assign({}, values, { [this.index]: index }));
            this._documents.set(index, newdoc);
            await this.db.insertOne(newdoc);
        } else {
            const newdoc = new Document(Object.assign({}, values, { [this.index]: index }));
            this._documents.set(index, newdoc);
            await this.db.replaceOne({ [this.index]: index }, newdoc);
        }

        this.checkIndexes(index);
    }
}

module.exports = DocumentCache;
