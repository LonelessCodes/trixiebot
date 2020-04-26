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

const { FILES_BASE } = require("../../info").default;
const path = require("path");
const fs = require("fs-extra");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Db } = require("mongodb");
const { User, Guild } = require("discord.js");

const { UserSample, GuildSample, PredefinedSample } = require("./soundboard/Sample");
const SampleUploader = require("./soundboard/SampleUploader").default;

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
    /**
     * @param {Db} db
     */
    constructor(db) {
        this.samples = db.collection("soundboard_samples");
        this.samples.createIndex({ id: 1 }, { unique: true });
        this.samples.createIndex({ created_at: 1 });
        this.predefined = db.collection("soundboard_predefined");
        this.predefined.createIndex({ name: 1 });
        /** @type {Promise<PredefinedSample[]>} */
        this.predefined_samples = this.predefined
            .find({})
            .toArray()
            .then(docs => docs.map(doc => new PredefinedSample(this, doc)));
        this.slots = db.collection("soundboard_slots");

        this.BASE = path.join(FILES_BASE, "soundboard");
        this.DEFAULT_SLOTS = 3;
        this.MAX_SLOTS = 10;
    }

    getPredefinedSamples() {
        return this.predefined_samples;
    }

    /**
     * @param {string} name
     */
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

        const docs = await this.samples
            .find({
                $or: [
                    {
                        guilds: guild.id,
                    },
                    {
                        owners: user.id,
                    },
                ],
            })
            .toArray();

        /** @type {UserSample[]} */
        const user_samples = [];
        /** @type {GuildSample[]} */
        const guild_samples = [];

        for (const doc of docs) {
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
        const doc = await this.samples.findOne({
            $or: [
                {
                    owners: user.id,
                },
                {
                    guilds: guild.id,
                },
            ],
            name: name,
        });
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

    /**
     * @param {User} user
     * @param {string} name
     */
    async getSampleUser(user, name) {
        const doc = await this.samples.findOne({
            owners: user.id,
            scope: "user",
            name: name,
        });
        if (!doc) return;
        return new UserSample(this, doc);
    }

    /**
     * @param {Guild} guild
     * @param {string} name
     */
    async getSampleGuild(guild, name) {
        const doc = await this.samples.findOne({
            guilds: guild.id,
            scope: "guild",
            name: name,
        });
        if (!doc) return;
        return new GuildSample(this, doc);
    }

    /**
     * @param {string} id
     */
    async getSampleById(id) {
        const doc = await this.samples.findOne({
            id,
        });
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
            await this.samples.updateOne({ id: sample.id }, { $addToSet: { owners: user.id } });
            sample.owners.push(user.id);
            return sample;
        } else if (user instanceof Guild) {
            await this.samples.updateOne({ id: sample.id }, { $addToSet: { guilds: user.id } });
            sample.guilds.push(user.id);
            return sample;
        } else if (user == null) {
            const predefined = new PredefinedSample(this, {
                name: sample.name,
                plays: sample.plays,
                filename: sample.filename,
                created_at: sample.created_at,
                modified_at: new Date(),
                last_played_at: sample.last_played_at,
            });
            await fs.ensureDir(path.dirname(predefined.file));
            await fs.copyFile(sample.file, predefined.file);
            await this.predefined.insertOne({
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
            if (sample.isCreator(user)) {
                await this.samples.deleteOne({ id: sample.id });
                await fs.unlink(sample.file);
            } else {
                await this.samples.updateOne({ id: sample.id }, { $removeFromSet: { owners: user.id } });
            }
        } else if (user instanceof Guild) {
            if (sample.isCreator(user)) {
                await this.samples.deleteOne({ id: sample.id });
                await fs.unlink(sample.file);
            } else {
                await this.samples.updateOne({ id: sample.id }, { $removeFromSet: { guilds: user.id } });
            }
        } else {
            await this.predefined.deleteOne({ name: sample.name });
            const predefined = await this.predefined_samples;
            const index = predefined.findIndex(p => p.name === sample.name);
            if (index >= 0) predefined.splice(index, 1);
            this.predefined_samples = Promise.resolve(predefined);
            await fs.unlink(sample.file);
        }
    }

    /**
     * @param {User} user
     */
    async getSlotsUser(user) {
        const slots = await this.slots.findOne({ user: user.id });
        return slots ? slots.slots : this.DEFAULT_SLOTS;
    }

    /**
     * @param {User} user
     */
    async getTakenSlotsUser(user) {
        return await this.slots.find({ owners: user.id }).count();
    }

    /**
     * @param {User} user
     * @param {number} new_slots
     */
    async setNewSlotsUser(user, new_slots) {
        if (new_slots > this.MAX_SLOTS) return new_slots;
        const slots = await this.slots.updateOne({ user: user.id }, { $set: { slots: new_slots } }, { upsert: true });
        return slots.slots;
    }

    /**
     * @param {Guild} guild
     */
    async getSlotsGuild(guild) {
        const slots = await this.slots.findOne({ guild: guild.id });
        return slots ? slots.slots : this.DEFAULT_SLOTS;
    }

    /**
     * @param {Guild} guild
     */
    async getTakenSlotsGuild(guild) {
        return await this.slots.find({ guilds: guild.id }).count();
    }

    /**
     * @param {Guild} guild
     * @param {number} new_slots
     */
    async setNewSlotsGuild(guild, new_slots) {
        if (new_slots > this.MAX_SLOTS) return new_slots;
        const slots = await this.slots.updateOne({ guild: guild.id }, { $set: { slots: new_slots } }, { upsert: true });
        return slots.slots;
    }
}

module.exports = SoundboardManager;
