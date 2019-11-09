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
const { Guild, GuildMember, Collection, VoiceChannel, VoiceConnection } = require("discord.js");
const EventEmitter = require("events");

/**
 * @param {VoiceConnection} connection
 */
async function disconnect(connection) {
    await connection.disconnect();
    if (connection.client.voiceConnections.get(connection.channel.guild.id)) {
        await connection.client.voiceConnections.get(connection.channel.guild.id).disconnect();
        if (connection.client.voiceConnections.get(connection.channel.guild.id))
            await connection.client.voiceConnections.get(connection.channel.guild.id)._destroy();
        await connection.client.voiceConnections.delete(connection.channel.guild.id);
    }
}

class ConnectError extends Error { }

class VCGuild extends EventEmitter {
    /**
     * @param {Guild} guild
     */
    constructor(guild) {
        super();

        this.client = guild.client;
        this.guild = guild;
        /**
         * @type {VoiceChannel}
         */
        this.vc = null;

        this.voiceStateUpdate = this.voiceStateUpdate.bind(this);
        this.client.addListener("voiceStateUpdate", this.voiceStateUpdate);
    }

    get connected() {
        if (!this.vc) return false;
        if (!this.vc.connection) return false;
        return true;
    }

    get playing() {
        if (!this.vc) return false;
        if (!this.vc.connection) return false;
        return this.vc.connection.speaking;
    }

    /**
     * @param {GuildMember} member
     */
    async connect(member) {
        if (!this.vc) {
            if (!member.voiceChannel) throw new ConnectError("You need to join a voice channel first!");

            const vc = member.voiceChannel;

            if (vc.full) throw new ConnectError("The voice channel you're in is full!");
            if (!vc.joinable) throw new ConnectError("Trixie doesn't have permissions to join the vc you're in");
            if (!vc.speakable) throw new ConnectError("Trixie doesn't have permissions to speak in the vc you're in");

            this.vc = vc;
        }

        if (!this.vc.connection) {
            await this.vc.join();

            this.vc.connection.once("disconnect", () => {
                this.leave();
            });
        }

        this.emit("connected", this.vc.connection);

        return this.vc.connection;
    }

    async leave() {
        if (!this.vc) return;

        if (this.vc.connection) {
            this.stop();
            if (this.vc && this.vc.connection) await disconnect(this.vc.connection);
        }
        // disconnect could trigger vc.connection.on("disconnect"), which will call leave
        // and set vc to null before we can do it here, therefore trigger VCGuild#leave twice
        if (!this.vc) return;

        this.vc.leave();
        this.vc = null;

        this.emit("leave");
    }

    stop() {
        if (!this.connected) return;
        if (!this.vc.connection.dispatcher) return;
        this.vc.connection.dispatcher.end();

        this.emit("end");
    }

    async destroy() {
        await this.leave();
        this.client.removeListener("voiceStateUpdate", this.voiceStateUpdate);
        this.emit("destroy");
        this.removeAllListeners();
    }

    /**
     * @param {GuildMember} oldMember
     * @param {GuildMember} newMember
     * @returns {void}
     */
    voiceStateUpdate(oldMember, newMember) {
        if (!this.connected) return;

        if (oldMember.user.id === this.client.user.id) {
            if (oldMember.voiceChannel && !newMember.voiceChannel) return this.destroy();
            this.vc = newMember.voiceChannel;
        } else {
            if (!oldMember.voiceChannel) return;
            if (oldMember.voiceChannel.id !== this.vc.id) return;
        }

        // TODO: Error: Cannot read property 'members' of undefined
        if (this.vc.members.filter(m => !m.user.bot).size > 0) return;

        this.leave();
    }
}

class AudioManager {
    constructor() {
        /**
         * @type {Collection<string, VCGuild>}
         */
        this.guilds = new Collection;
    }

    /**
     * @param {Guild} guild
     * @returns {VCGuild}
     */
    getGuild(guild) {
        if (this.guilds.has(guild.id)) return this.guilds.get(guild.id);
        const g = new VCGuild(guild).once("destroy", () => this.guilds.delete(guild.id));
        this.guilds.set(guild.id, g);
        return g;
    }

    /**
     * @param {Guild} guild
     * @returns {boolean}
     */
    hasGuild(guild) {
        return this.guilds.has(guild.id);
    }
}

module.exports = new AudioManager;
module.exports.ConnectError = ConnectError;
