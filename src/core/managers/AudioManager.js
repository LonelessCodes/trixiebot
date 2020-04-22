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

const Translation = require("../../modules/i18n/Translation").default;
// eslint-disable-next-line no-unused-vars
const { Guild, GuildMember, VoiceState, Collection } = require("discord.js");
const EventEmitter = require("events");
// eslint-disable-next-line no-unused-vars
const { Resolvable } = require("../../modules/i18n/Resolvable");

class ConnectError {
    /**
     * @param {Resolvable|string} message
     */
    constructor(message) {
        this.message = message;
    }
}

class AudioGuild extends EventEmitter {
    /**
     * @param {Guild} guild
     */
    constructor(guild) {
        super();

        this.voiceStateUpdate = this.voiceStateUpdate.bind(this);
        this.client = guild.client;
        this.guild = guild;
    }

    _removeListener() {
        this.client.removeListener("voiceStateUpdate", this.voiceStateUpdate);
    }
    _attachListener() {
        this._removeListener();
        this.client.addListener("voiceStateUpdate", this.voiceStateUpdate);
    }

    get voice() {
        return this.guild.voice;
    }
    get connection() {
        return this.voice && this.voice.connection;
    }
    get channel() {
        return this.voice && this.voice.channel;
    }

    get connected() {
        if (!this.channel) return false;
        if (!this.connection) return false;
        return true;
    }
    get playing() {
        if (!this.connected) return false;
        return !!this.connection.player.dispatcher;
    }

    /**
     * @param {GuildMember} member
     */
    async connect(member) {
        if (this.connection) return this.connection;

        // There can be bugs where bot is still part of channel, but lost connection
        if (this.channel) {
            await this.channel.join();
        } else {
            if (!member.voice.channelID) throw new ConnectError(new Translation("audio.join_ch", "You need to join a voice channel first!"));

            const vc = member.voice.channel;

            if (vc.full) throw new ConnectError(new Translation("audio.ch_full", "The voice channel you're in is full!"));
            if (!vc.joinable) throw new ConnectError(new Translation("audio.no_perms_join", "Trixie doesn't have permissions to join the vc you're in"));
            if (!vc.speakable) throw new ConnectError(new Translation("audio.no_perms_speak", "Trixie doesn't have permissions to speak in the vc you're in"));

            await vc.join();
        }

        this._attachListener();

        this.connection.once("disconnect", () => this.leave());
        this.connection.setSpeaking(0);

        this.emit("connected", this.connection);

        return this.connection;
    }

    stop() {
        if (!this.playing) return;
        this.connection.player.destroy();
    }

    leave() {
        this._removeListener();

        if (!this.channel) return;
        this.channel.leave();
        this.emit("leave");
    }

    /**
     * @param {VoiceState} oldState
     * @param {VoiceState} newState
     * @returns {void}
     */
    voiceStateUpdate(oldState, newState) {
        if (!this.connected) return;

        if (oldState.member.user.id === this.client.user.id) {
            if (oldState.channelID && !newState.channelID) return this.leave();
        } else {
            if (!oldState.channelID) return;
            if (oldState.channelID !== this.channel.id) return;
        }

        if (this.channel.members.filter(m => !m.user.bot).size > 0) return;

        this.leave();
    }
}

class AudioManager {
    constructor() {
        this.holds = AudioGuild;

        /** @type {Collection<string, AudioGuild>} */
        this.cache = new Collection;
    }

    /**
     * @param {Guild} guild
     * @returns {AudioGuild}
     */
    getGuild(guild) {
        if (this.cache.has(guild.id)) return this.cache.get(guild.id);
        const g = new AudioGuild(guild);
        this.cache.set(guild.id, g);
        return g;
    }

    /**
     * Resolves a data entry to a data Object.
     * @param {string|Object} idOrInstance The id or instance of something in this Manager
     * @returns {?Object} An instance from this Manager
     */
    resolve(idOrInstance) {
        if (idOrInstance instanceof this.holds) return idOrInstance;
        if (typeof idOrInstance === "string") return this.cache.get(idOrInstance) || null;
        return null;
    }

    /**
     * Resolves a data entry to a instance ID.
     * @param {string|Object} idOrInstance The id or instance of something in this Manager
     * @returns {?Snowflake}
     */
    resolveID(idOrInstance) {
        if (idOrInstance instanceof this.holds) return idOrInstance.id;
        if (typeof idOrInstance === "string") return idOrInstance;
        return null;
    }

    valueOf() {
        return this.cache;
    }
}

module.exports = new AudioManager;
module.exports.ConnectError = ConnectError;
