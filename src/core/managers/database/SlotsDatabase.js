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
const SlotsCursor = require("./slots/SlotsCursor");

class SlotsDatabase {
    /**
     * @param {Mongo.Db} db
     */
    constructor(db) {
        this.db = db.collection("slots");
        this.db.createIndex({ userId: 1 }, { unique: true });

        /** @type {Map<string, SlotsCursor>} */
        this._slots = new Map();
    }

    /**
     * @param {string} name
     * @param {number} min
     * @param {number} max
     * @returns {SlotsDatabase}
     */
    register(name, min, max) {
        const slot = new SlotsCursor(this.db, name, min, max);
        this._slots.set(name, slot);
        return slot;
    }

    /**
     * @param {string} name
     * @param {GuildMember|User} user
     * @returns {Promise<boolean>}
     */
    hasMax(name, user) {
        if (!this._slots.has(name)) throw new Error("You need to register '" + name + "' first");
        return this._slots.get(name).hasMax(user);
    }

    /**
     * @param {string} name
     * @param {GuildMember|User} user
     * @returns {Promise<number>}
     */
    get(name, user) {
        if (!this._slots.has(name)) throw new Error("You need to register '" + name + "' first");
        return this._slots.get(name).get(user);
    }

    /**
     * @param {string} name
     * @param {GuildMember|User} user
     * @param {number} [inc=1]
     * @returns {Promise<void>}
     */
    add(name, user, inc = 1) {
        if (!this._slots.has(name)) throw new Error("You need to register '" + name + "' first");
        return this._slots.get(name).add(user, inc);
    }

    /**
     * @param {string} name
     * @param {GuildMember|User} user
     * @param {number} val
     * @returns {Promise<void>}
     */
    set(name, user, val) {
        if (!this._slots.has(name)) throw new Error("You need to register '" + name + "' first");
        return this._slots.get(name).set(user, val);
    }

    /**
     * @param {GuildMember|User} user
     * @returns {Promise<any>}
     */
    getUser(user) {
        if (user instanceof GuildMember) user = user.user;
        return this.db.findOne({ userId: user.id }, { projection: { _id: 0, userId: 0 } });
    }
}

module.exports = SlotsDatabase;
