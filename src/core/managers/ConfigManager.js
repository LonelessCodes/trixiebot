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

const { isPlainObject } = require("../../util/util");
// eslint-disable-next-line no-unused-vars
const { Db } = require("mongodb");
// eslint-disable-next-line no-unused-vars
const { Client, TextChannel } = require("discord.js");
const DocumentMapCache = require("../../modules/db/DocumentMapCache").default;
// eslint-disable-next-line no-unused-vars
const { Resolvable } = require("../../modules/i18n/Resolvable");

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
    /**
     * @param {string} name
     * @param {Resolvable<string>} humanName
     * @param {*} defaultValue
     * @param {*} type
     * @param {boolean} allowEmpty
     */
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

        if (this.types.includes(Boolean) && /true|false|yes|no/i.test(value)) return /true|yes/i.test(value);
        if (this.types.includes(Number) && !Number.isNaN(parseFloat(value))) return parseFloat(value);
        if (this.types.includes(String)) return value;

        if (this.types.includes(TextChannel)) return value.substr(2, value.length - 3);

        return value;
    }

    human(value) {
        if (this.allowEmpty && !value) return "none";
        if (this.types.includes(TextChannel)) {
            return "#" + (this.client.channels.cache.get(value) || { name: "deleted-channel" }).name;
        }

        return String(value);
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
        this._cache = new DocumentMapCache(this.db, "guildId");

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
    }

    async get(guildId, parameter) {
        // will fire instantly if loaded already, are wait
        // till all configurations are initially loaded into memory
        let config = await this._cache.get(guildId);
        if (!config) config = Object.assign({}, this.default_config);
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
        } else return config;
    }

    async set(guildId, values = {}) {
        if (!isPlainObject(values)) throw new Error("Values is not of type Object");

        delete values._id;

        const func = obj => {
            for (const key in obj) {
                if (typeof obj[key] === "string" && obj[key] === "") obj[key] = null;
                else if (typeof obj[key] === "object") func(obj[key]);
            }
        };
        func(values);

        const config = await this._cache.get(guildId) || {};
        for (const key in values) {
            index(config, key, values[key]);
        }

        await this._cache.set(guildId, Object.assign({}, this.default_config, config));
    }
}

ConfigManager.Parameter = Parameter;

module.exports = ConfigManager;
