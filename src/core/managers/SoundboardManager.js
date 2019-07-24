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

const { FILES_BASE } = require("../../info");
const path = require("path");
const fs = require("fs-extra");
const database = require("../../modules/db/database");
// eslint-disable-next-line no-unused-vars
const { User, Guild } = require("discord.js");

const { UserSample, GuildSample, PredefinedSample } = require("./soundboard/Sample");
const SampleUploader = require("./soundboard/SampleUploader");

/**
 * Scheme
 * {
 *   id: SampleID;
 *   name: string; default
 *   creator: Snowflake;
 *   guild: Snowflake;
 *   scope: "user"|"guild"
 *   owners: Snowflake[];
 *   guilds: Snowflake[];
 *   plays: number; default
 *   created_at: Date;
 *   modified_at: Date;
 * }
 */

class SoundboardManager {
    constructor() {
        this.samples = database().then(db => db.collection("soundboard_samples")).then(async db => {
            await db.createIndex({ id: 1 }, { unique: true });
            await db.createIndex({ created_at: 1 });
            return db;
        });
        this.predefined = database().then(db => db.collection("soundboard_predefined")).then(async db => {
            await db.createIndex({ name: 1 });
            return db;
        });
        /** @type {Promise<PredefinedSample[]>} */
        this.predefined_samples = this.predefined
            .then(db => db.find({}).toArray())
            .then(docs => docs.map(doc => new PredefinedSample(this, doc)));
        this.slots = database().then(db => db.collection("soundboard_slots"));

        this.BASE = path.join(FILES_BASE, "soundboard");
        this.DEFAULT_SLOTS = 3;
        this.MAX_SLOTS = 10;
    }

    getPredefinedSamples() {
        return this.predefined_samples;
    }

    async getPredefinedSample(name) {
        const predefined = await this.getPredefinedSamples();
        return predefined.find(sample => sample.name === name);
    }

    /**
     * Get all available samples in a server including predefined, server and user samples
     * @param {Guild} guild
     * @param {User} user
     */
    async getAvailableSamples(guild, user) {
        const predefined_samples = await this.getPredefinedSamples();

        const docs = await this.samples.then(db => db.find({
            $or: [{
                guilds: guild.id,
            }, {
                owners: user.id,
            }],
        }).toArray());

        /** @type {UserSample[]} */
        const user_samples = [];
        /** @type {GuildSample[]} */
        const guild_samples = [];

        for (let doc of docs) {
            if (doc.owners.some(id => user.id === id)) {
                switch (doc.scope) {
                    case "user":
                        user_samples.push(new UserSample(this, doc));
                        break;
                    case "guild":
                        user_samples.push(new GuildSample(this, doc));
                        break;
                }
            }
            if (doc.guilds.some(id => guild.id === id)) {
                switch (doc.scope) {
                    case "user":
                        guild_samples.push(new UserSample(this, doc));
                        break;
                    case "guild":
                        guild_samples.push(new GuildSample(this, doc));
                        break;
                }
            }
        }

        const total = docs.length;

        return {
            total,
            predefined: predefined_samples,
            user: user_samples,
            guild: guild_samples,
        };
    }

    /**
     * @param {Guild} guild
     * @param {User} user
     * @param {string} name
     */
    async getSample(guild, user, name) {
        const doc = await this.samples.then(db => db.findOne({
            $or: [{
                owners: user.id,
            }, {
                guilds: guild.id,
            }],
            name: name,
        }));
        if (doc) {
            switch (doc.scope) {
                case "user":
                    return new UserSample(this, doc);
                case "guild":
                    return new GuildSample(this, doc);
            }
            return;
        }

        const predefined = await this.getPredefinedSample(name);
        if (predefined) return predefined;
    }

    async getSampleUser(user, name) {
        const doc = await this.samples.then(db => db.findOne({
            owners: user.id,
            scope: "user",
            name: name,
        }));
        if (!doc) return;
        return new UserSample(this, doc);
    }

    async getSampleGuild(guild, name) {
        const doc = await this.samples.then(db => db.findOne({
            guilds: guild.id,
            scope: "guild",
            name: name,
        }));
        if (!doc) return;
        return new GuildSample(this, doc);
    }

    /**
     * @param {string} id
     */
    async getSampleById(id) {
        const doc = await this.samples.then(db => db.findOne({
            id,
        }));
        if (!doc) return;
        switch (doc.scope) {
            case "user":
                return new UserSample(this, doc);
            case "guild":
                return new GuildSample(this, doc);
        }
    }

    /**
     * @param {User} user
     * @returns {SampleUploader}
     */
    getSampleUploader(user) {
        return new SampleUploader(this, user);
    }

    /**
     * @param {User|Guild} user
     * @param {PredefinedSample|UserSample|GuildSample} sample
     */
    async importSample(user, sample) {
        if (user instanceof User) {
            const db = await this.samples;
            await db.updateOne({ id: sample.id }, { $addToSet: { owners: user.id } });
            sample.owners.push(user.id);
            return sample;
        } else if (user instanceof Guild) {
            const db = await this.samples;
            await db.updateOne({ id: sample.id }, { $addToSet: { guilds: user.id } });
            sample.guilds.push(user.id);
            return sample;
        } else if (user == null) {
            const db = await this.predefined;
            const predefined = new PredefinedSample(this, {
                name: sample.name,
                plays: sample.plays,
                filename: sample.filename,
                created_at: sample.created_at,
                modified_at: new Date,
                last_played_at: sample.last_played_at,
            });
            await fs.ensureDir(path.dirname(predefined.file));
            await fs.copyFile(sample.file, predefined.file);
            await db.insertOne({
                name: predefined.name,
                plays: predefined.plays,
                filename: predefined.filename,
                created_at: predefined.created_at,
                modified_at: predefined.modified_at,
                last_played_at: predefined.last_played_at,
            });
            this.predefined_samples = Promise.resolve([...(await this.predefined_samples), predefined]);
            return predefined;
        }
    }

    /**
     * @param {User|Guild} user
     * @param {PredefinedSample|UserSample|GuildSample} sample
     */
    async removeSample(user, sample) {
        if (user instanceof User) {
            const db = await this.samples;
            if (sample.isCreator(user)) {
                await db.deleteOne({ id: sample.id });
                await fs.unlink(sample.file);
            } else {
                await db.updateOne({ id: sample.id }, { $removeFromSet: { owners: user.id } });
            }
        } else if (user instanceof Guild) {
            const db = await this.samples;
            if (sample.isCreator(user)) {
                await db.deleteOne({ id: sample.id });
                await fs.unlink(sample.file);
            } else {
                await db.updateOne({ id: sample.id }, { $removeFromSet: { guilds: user.id } });
            }
        } else if (user == null) {
            const db = await this.predefined;
            await db.deleteOne({ name: sample.name });
            const predefined = await this.predefined_samples;
            const index = predefined.findIndex(p => p.name === sample.name);
            if (index >= 0) predefined.splice(index, 1);
            this.predefined_samples = Promise.resolve(predefined);
            await fs.unlink(sample.file);
        }
    }

    async getSlotsUser(user) {
        const slots = await this.slots.then(db => db.findOne({ user: user.id }));
        return slots ? slots.slots : this.DEFAULT_SLOTS;
    }

    async getTakenSlotsUser(user) {
        return await this.slots.then(db => db.find({ owners: user.id }).count());
    }

    async setNewSlotsUser(user, new_slots) {
        if (new_slots > this.MAX_SLOTS) return new_slots;
        const slots = await this.slots.then(db => db
            .updateOne({ user: user.id }, { $set: { slots: new_slots } }, { upsert: true }));
        return slots.slots;
    }

    async getSlotsGuild(guild) {
        const slots = await this.slots.then(db => db.findOne({ guild: guild.id }));
        return slots ? slots.slots : this.DEFAULT_SLOTS;
    }

    async getTakenSlotsGuild(guild) {
        return await this.slots.then(db => db.find({ guilds: guild.id }).count());
    }

    async setNewSlotsGuild(guild, new_slots) {
        if (new_slots > this.MAX_SLOTS) return new_slots;
        const slots = await this.slots.then(db => db
            .updateOne({ guild: guild.id }, { $set: { slots: new_slots } }, { upsert: true }));
        return slots.slots;
    }
}

module.exports = new SoundboardManager;
