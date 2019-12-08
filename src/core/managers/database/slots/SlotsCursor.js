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

class SlotsCursor {
    /**
     * @param {Mongo.Collection} collection
     * @param {string} name
     * @param {number} min
     * @param {number} max
     */
    constructor(collection, name, min, max) {
        this.db = collection;

        this.name = name;
        this.min = min;
        this.max = max;
    }

    /**
     * @param {GuildMember|User} user
     * @returns {Promise<boolean>}
     */
    async hasMax(user) {
        if (user instanceof GuildMember) user = user.user;

        const doc = await this.db.findOne({ userId: user.id }, { projection: { [this.name]: 1 } });
        if (!doc || typeof doc[this.name] !== "number") return false;

        return doc[this.name] >= (this.max - this.min);
    }

    /**
     * @param {GuildMember|User} user
     * @returns {Promise<number>}
     */
    async get(user) {
        if (user instanceof GuildMember) user = user.user;

        const doc = await this.db.findOne({ userId: user.id }, { projection: { [this.name]: 1 } });
        if (!doc || typeof doc[this.name] !== "number") return this.min;

        return Math.min(this.max, doc[this.name] + this.min);
    }

    /**
     * @param {GuildMember|User} user
     * @param {number} [inc=1]
     * @returns {Promise<void>}
     */
    async add(user, inc = 1) {
        if (user instanceof GuildMember) user = user.user;

        await this.db.updateOne({ userId: user.id }, { $inc: { [this.name]: inc } }, { upsert: true });
    }

    /**
     * @param {GuildMember|User} user
     * @param {number} val
     * @returns {Promise<void>}
     */
    async set(user, val) {
        if (user instanceof GuildMember) user = user.user;

        await this.db.updateOne({ userId: user.id }, { $set: { [this.name]: val } }, { upsert: true });
    }
}

module.exports = SlotsCursor;
