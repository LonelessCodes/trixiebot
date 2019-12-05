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

// eslint-disable-next-line no-unused-vars
const Mongo = require("mongodb");
// eslint-disable-next-line no-unused-vars
const { GuildMember, User } = require("discord.js");

class SlotsDatabase {
    /**
     * @param {Mongo.Db} db
     */
    constructor(db) {
        this.db = db.collection("slots");
        this.db.createIndex({ userId: 1 }, { unique: true });

        /** @type {Map<string, { min: number; max: number; }>} */
        this._slots = new Map;
    }

    /**
     * @param {string} name
     * @param {number} min
     * @param {number} max
     * @returns {SlotsDatabase}
     */
    register(name, min, max) {
        this._slots.set(name, { min, max });
        return this;
    }

    /**
     * @param {string} name
     * @param {GuildMember|User} user
     * @returns {Promise<boolean>}
     */
    async hasMax(name, user) {
        if (user instanceof GuildMember) user = user.user;

        if (!this._slots.has(name)) throw new Error("You need to register '" + name + "' first");

        const doc = await this.db.findOne({ userId: user.id }, { projection: { [name]: 1 } });
        if (!doc || typeof doc[name] !== "number") return false;

        const slot = this._slots.get(name);
        return doc[name] >= (slot.max - slot.min);
    }

    /**
     * @param {string} name
     * @param {GuildMember|User} user
     * @returns {Promise<number>}
     */
    async get(name, user) {
        if (user instanceof GuildMember) user = user.user;

        if (!this._slots.has(name)) throw new Error("You need to register '" + name + "' first");

        const slot = this._slots.get(name);

        const doc = await this.db.findOne({ userId: user.id }, { projection: { [name]: 1 } });
        if (!doc || typeof doc[name] !== "number") return slot.min;

        return Math.min(slot.max, doc[name] + slot.min);
    }

    /**
     * @param {string} name
     * @param {GuildMember|User} user
     * @param {number} [inc=1]
     * @returns {Promise<void>}
     */
    async add(name, user, inc = 1) {
        if (user instanceof GuildMember) user = user.user;

        if (!this._slots.has(name)) throw new Error("You need to register '" + name + "' first");

        await this.db.updateOne({ userId: user.id }, { $inc: { [name]: inc } });
    }

    /**
     * @param {string} name
     * @param {GuildMember|User} user
     * @param {number} val
     * @returns {Promise<void>}
     */
    async set(name, user, val) {
        if (user instanceof GuildMember) user = user.user;

        if (!this._slots.has(name)) throw new Error("You need to register '" + name + "' first");

        await this.db.updateOne({ userId: user.id }, { $set: { [name]: val } });
    }

    /**
     * @param {GuildMember|User} user
     * @returns {{}}
     */
    async getUser(user) {
        if (user instanceof GuildMember) user = user.user;
        const doc = await this.db.findOne({ userId: user.id }, { projection: { _id: 0, userId: 0 } });
        if (!doc) return null;
        return doc;
    }
}

module.exports = SlotsDatabase;
