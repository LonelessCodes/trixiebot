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

const path = require("path");
const fs = require("fs-extra");
const prism = require("prism-media");
// eslint-disable-next-line no-unused-vars
const { User, Guild, VoiceConnection, StreamDispatcher } = require("discord.js");

class Sample {
    /**
     * @param {SoundboardManager} manager
     * @param {{}} doc
     */
    constructor(manager, doc) {
        this.manager = manager;

        this.db = manager.samples;

        /** @type {string} */
        this.name = doc.name;
        /** @type {number} */
        this.plays = doc.plays;
        /** @type {string} */
        this.filename = doc.filename;
        /** @type {Date} */
        this.created_at = doc.created_at;
        /** @type {Date} */
        this.modified_at = doc.modified_at;
        /** @type {Date} */
        this.last_played_at = doc.last_played_at;
    }

    get file() {
        return path.join(this.manager.BASE, this.id + ".ogg");
    }

    get importable() {
        return true;
    }

    /**
     * @param {VoiceConnection} connection
     * @returns {Promise<StreamDispatcher, Error>}
     */
    _play(connection) {
        /*
        The opus encoder and decoder for ffmpeg is preeeeeeetty broken, so
        therefore we rather directly use the ogg demuxer from the prism library
        and pipe it through to the websocket
        */
        return new Promise((res, rej) => {
            try {
                const dispatcher = connection.playOpusStream(
                    fs.createReadStream(this.file)
                        .pipe(new prism.opus.OggDemuxer())
                );
                dispatcher.once("start", () => {
                    connection.player.streamingData.pausedTime = 0;
                });
                res(dispatcher);
            } catch (err) {
                rej(err);
            }
        });
    }

    /**
     * @param {VoiceConnection} connection
     */
    async play(connection) {
        const dispatcher = await this._play(connection);
        await this.db.then(db => db.updateOne({ id: this.id }, { $inc: { plays: 1 }, $set: { last_played_at: new Date } }));
        return dispatcher;
    }

    /**
     * @param {User} user
     * @returns {boolean}
     */
    isOwner(user) {
        return this.owners.some(id => id === user.id);
    }
    /**
     * @param {Guild} guild
     * @returns {boolean}
     */
    isGuild(guild) {
        return this.guilds.some(id => id === guild.id);
    }
}

class PredefinedSample extends Sample {
    /**
     * @param {SoundboardManager} manager
     * @param {{}} doc
     */
    constructor(manager, doc) {
        super(manager, doc);

        this.db = manager.predefined;
    }

    get file() {
        return path.join(this.manager.BASE, "predefined", this.name + ".ogg");
    }

    get importable() {
        return false;
    }

    /**
     * @param {VoiceConnection} connection
     */
    async play(connection) {
        const dispatcher = await this._play(connection);
        await this.db.then(db => db.updateOne({ name: this.name }, { $inc: { plays: 1 }, $set: { last_played_at: new Date } }));
        return dispatcher;
    }

    isOwner() {
        return true;
    }
    isGuild() {
        return true;
    }
}

class UserSample extends Sample {
    /**
     * @param {SoundboardManager} manager
     * @param {{}} doc
     */
    constructor(manager, doc) {
        super(manager, doc);

        /** @type {SampleID} */
        this.id = doc.id;
        /** @type {string} */
        this.creator = doc.creator;
        /** @type {string[]} */
        this.owners = doc.owners;
        /** @type {string[]} */
        this.guilds = doc.guilds;
    }

    /**
     * @param {User} user
     * @returns {boolean}
     */
    isCreator(user) {
        return this.creator === user.id;
    }
}

class GuildSample extends Sample {
    /**
     * @param {SoundboardManager} manager
     * @param {{}} doc
     */
    constructor(manager, doc) {
        super(manager, doc);

        /** @type {SampleID} */
        this.id = doc.id;
        /** @type {string} */
        this.guild = doc.guild;
        /** @type {string[]} */
        this.owners = doc.owners;
        /** @type {string[]} */
        this.guilds = doc.guilds;
    }

    /**
     * @param {Guild} guild
     * @returns {boolean}
     */
    isCreator(guild) {
        return this.guild === guild.id;
    }
}

module.exports = {
    Sample,
    PredefinedSample,
    UserSample,
    GuildSample,
};
