const { isPlainObject } = require("../../modules/utils");
const { Db } = require("mongodb");
const { Client, TextChannel } = require("discord.js");
const DocumentCache = require("../DocumentCache");

function index(obj, is, value) {
    if (typeof is == "string")
        return index(obj, is.split("."), value);
    else if (is.length == 1 && value !== undefined)
        return obj[is[0]] = value;
    else if (is.length == 0)
        return obj;
    else {
        if (!obj[is[0]])
            obj[is[0]] = {};
        return index(obj[is[0]], is.slice(1), value);
    }
}

class Parameter {
    constructor(name, humanName, defaultValue, type, allowEmpty) {
        this.name = name;
        this.humanName = humanName;
        this.defaultValue = defaultValue;
        if (type instanceof Array) this.types = type;
        else this.types = [type];
        this.allowEmpty = allowEmpty;
        /** @type {Client} */
        this.client = null;
    }

    setClient(client) {
        this.client = client;
    }

    format(value) {
        if (this.allowEmpty && (/empty|none/i.test(value) || value === "" || value === null)) return null;
        if (/default/i.test(value)) return this.defaultValue;

        for (let type of this.types) {
            if (typeof type === "string" && type.toLowerCase() === value.toLowerCase()) return type;
            if (typeof type === "number" && type === parseFloat(value)) return type;
        }

        if (this.types.includes(Boolean) && /true|false|yes|no/i.test(value)) return /true|yes/i.test(value) ? true : false;
        if (this.types.includes(Number) && !Number.isNaN(parseFloat(value))) return parseFloat(value);
        if (this.types.includes(String)) return value;

        if (this.types.includes(TextChannel)) return value.substr(2, value.length - 3);
        
        return value;
    }

    human(value) {
        if (this.allowEmpty && !value) return "none";
        if (this.types.includes(TextChannel)) {
            return "#" + (this.client.channels.get(value) || { name: "deleted-channel" }).name;
        }

        return value;
    }

    check(value) {
        if (!this.allowEmpty && (/empty|none/i.test(value) || value === "" || value === null)) return false;
        else if (this.allowEmpty && (/empty|none/i.test(value) || value === "" || value === null)) return true;
        if (value === "default") return true;

        if (this.types.includes(TextChannel) && /^<(#\d{12,})>/.test(value)) return true;

        if (this.types.includes(String)) return true;
        if (this.types.includes(Number) && !Number.isNaN(parseFloat(value))) return true;
        if (this.types.includes(Boolean) && /true|false|yes|no/i.test(value)) return true;

        for (const type of this.types) {
            if (typeof type === "string" && type.toLowerCase() === value.toLowerCase()) return true;
            if (typeof type === "number" && type === parseFloat(value)) return true;
        }

        return false;
    }
}

class ConfigManager {
    /**
     * Initiate new guild configurations manager. Prefix, locale, etc.
     * @param {Client} client 
     * @param {Db} db 
     * @param {Parameter[]} parameters 
     */
    constructor(client, db, parameters) {
        this.client = client;

        this.db = db.collection("guild_config");
        this._cache = new DocumentCache(this.db, "guildId", {
            "guildId": { unique: true },
            "removedFrom": { expireAfterSeconds: 7 * 24 * 3600, sparse: true }
        });

        const values = {};

        for (let i = 0; i < parameters.length; i++) {
            let parameter = parameters[i];
            parameter.position = i;
            parameter.setClient(this.client);

            if (parameter.name instanceof Array) {
                for (let j = 0; j < parameter.name.length; j++) {
                    let sub = parameter.name[j];
                    sub.position = j;
                    sub.setClient(this.client);

                    index(values, sub.name, sub.defaultValue);
                }
            } else {
                values[parameter.name] = parameter.defaultValue;
            }
        }

        this.default_config = values;

        this.parameters = parameters;

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

        if (parameter) {
            parameter = parameter.split(".");
            let path = config;
            for (let param of parameter) {
                path = path[param];
            }
            return path;
        }
        else return config;
    }

    async set(guildId, values = {}) {
        if (!isPlainObject(values)) throw new Error("Values is not of type Object");

        delete values._id;

        const config = await this._cache.get(guildId) || {};
        for (const key in values) {
            index(config, key, values[key]);
        }
        
        this._cache.set(guildId, Object.assign({}, this.default_config, config, { guildId }));
    }
}

ConfigManager.Parameter = Parameter;

module.exports = ConfigManager;
