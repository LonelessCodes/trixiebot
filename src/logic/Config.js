const { Db } = require("mongodb");
const { Client } = require("discord.js");

function isPlainObject(input) {
    return input && !Array.isArray(input) && typeof input === "object";
}

// ConfigManager does not scale well now. Memory usage goes up linear to database size
// Currently speed is of greater priority than scalability. Will have to change that 
// when bot gets bigger should limit cache to 1000 most active guilds or so 

class Config extends Object {
    constructor(configuration) {
        configuration = Object.setPrototypeOf(configuration, Config.prototype);
        return configuration;
    }
}

class ConfigManager {
    /**
     * Initiate new guild configurations manager. Prefix, custom commands, etc.
     * @param {Client} client 
     * @param {Db} db 
     * @param {{}} default_config 
     */
    constructor(client, db, default_config) {
        this.client = client;
        this.db = db.collection("guild_config");
        this.db.createIndex("guildId", { unique: true });
        this.db.createIndex("removedFrom", { expireAfterSeconds: 7 * 24 * 3600, sparse: true });
        this.default_config = default_config || {};
        /** @type {Map<string, Config>} */
        this._configs = new Map;
        this.initial_load = new Promise((resolve, reject) => {
            const stream = this.db.find({});
            stream.addListener("data", config => {
                this._configs.set(config.guildId, new Config(Object.assign(this.default_config, config)));
            });
            stream.once("end", () => resolve());
            stream.once("error", err => reject(err));
        });

        this.addListeners();
    }

    addListeners() {
        this.client.addListener("guildCreate", async guild => {
            const config = await this.get(guild.id);
            if (!config.default &&
                config.removedFrom instanceof Date)
                await this.set(guild.id, { removedFrom: undefined });
        });
        this.client.addListener("guildDelete", async guild => {
            const config = await this.get(guild.id);
            if (!config.default) await this.set(guild.id, { removedFrom: new Date });
        });
    }

    async get(guildId) {
        // will fire instantly if loaded already, are wait 
        // till all configurations are initially loaded into memory
        await this.initial_load;
        if (this._configs.has(guildId)) return this._configs.get(guildId);
        else return new Config(Object.assign(this.default_config, { guildId }, { default: true }));
    }

    async set(guildId, values = {}) {
        if (!isPlainObject(values)) throw new Error("Values is not of type Object");

        await this.initial_load;
        if (!this._configs.has(guildId)) {
            const config = new Config(Object.assign(this.default_config, { guildId }, values));
            this._configs.set(guildId, config);
            await this.db.insertOne(config);
        } else {
            const config = this._configs.get(guildId);
            this._configs.set(guildId, new Config(Object.assign(config, { guildId }, values)));
            await this.db.updateOne({ guildId }, config);
        }
    }
}

module.exports = ConfigManager;
