const { MongoClient } = require("mongodb");

class Collection {
    constructor(db, name) {
        this.db = db;
        this.name = name;
    }
}

class DB {
    /**
     * @param {Client} client 
     * @param {string} db_name 
     */
    constructor(client, db_name, options) {
        this.name = db_name;
        this.client = client;
        this.options = options;
    }

    collection(name) {
        return new Collection(this, name);
    }

    async ensureIndex(name, fieldOrSpec, options) {
        await this.client.connecting;

        return await this.client.mongoclient.db(this.name, this.options).createIndex(name, fieldOrSpec, options);
    }
}

class Client {
    static connect(uri, options) {
        return new Client(uri, options);
    }

    constructor(uri, options) {
        /** 
         * @type {MongoClient}
         */
        this.mongoclient = null;
        this.connecting = new Promise((res, rej) => {
            MongoClient.connect(uri, options).then(client => {
                this.mongoclient = client;
                res();
            }).catch(err => rej(err));
        });
    }

    catch(callback) {
        this.connecting.catch(err => callback(err));
    }

    db(name, options) {
        return new DB(this, name, options);
    }
}

module.exports = Client.connect("mongodb://localhost:27017/", {
    autoReconnect: true,
    useNewUrlParser: true
});