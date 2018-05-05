const { isPlainObject } = require("../modules/util");
const { Db } = require("mongodb");
const { Client } = require("discord.js");
const DocumentCache = require("./DocumentCache");

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
        this._cache = new DocumentCache(this.db, "guildId", {
            "guildId": { unique: true },
            "removedFrom": { expireAfterSeconds: 7 * 24 * 3600, sparse: true }
        });

        this.default_config = default_config || {};

        this.addListeners();
    }

    addListeners() {
        this.client.addListener("guildCreate", async guild => {
            const config = await this._cache.get(guild.id);
            if (config &&
                config.removedFrom instanceof Date)
                await this._cache.set(guild.id, Object.assign({}, config, { removedFrom: undefined }));
        });

        this.client.addListener("guildDelete", async guild => {
            const config = await this._cache.get(guild.id);
            if (config) await this._cache.set(guild.id, Object.assign({}, config, { removedFrom: new Date }));
        });
    }

    async get(guildId, parameter) {
        // will fire instantly if loaded already, are wait 
        // till all configurations are initially loaded into memory
        let config = await this._cache.get(guildId);
        if (!config) config = Object.assign({}, this.default_config, { guildId });
        else config = Object.assign({}, this.default_config, config);

        delete config.guildId;
        delete config._id;

        if (parameter) return config[parameter];
        else return config;
    }

    async set(guildId, values = {}) {
        if (!isPlainObject(values)) throw new Error("Values is not of type Object");

        delete values._id;

        const config = await this._cache.get(guildId) || {};
        this._cache.set(guildId, Object.assign({}, this.default_config, config, values, { guildId }));
    }
}

module.exports = ConfigManager;
