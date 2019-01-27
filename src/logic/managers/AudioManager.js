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
        await connection.client.voiceConnections.get(connection.channel.guild.id)._destroy();
        await connection.client.voiceConnections.remove(connection.client.voiceConnections.get(connection.channel.guild.id));
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

        this.voiceStateChanged = this.voiceStateChanged.bind(this);
        this.client.addListener("voiceStateUpdate", this.voiceStateChanged);
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
            await this.stop();
            await disconnect(this.vc.connection);
        }
        if (this.vc) this.vc.leave();
        this.vc = null;

        this.emit("leave");
    }

    async stop() {
        if (!this.connected) return;
        if (!this.vc.connection.dispatcher) return;
        this.vc.connection.dispatcher.end();

        this.emit("end");
    }

    async destroy() {
        await this.leave();
        this.client.removeListener("voiceStateUpdate", this.voiceStateChanged);
        this.emit("destroy");
        this.removeAllListeners();
    }

    /**
     * @param {GuildMember} oldMember 
     */
    voiceStateChanged(oldMember) {
        if (!this.connected) return;

        if (!oldMember.voiceChannel) return;
        if (oldMember.voiceChannel.id !== this.vc.id) return;
        if (this.vc.members.size > 1) return;

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
        const g = new VCGuild(guild);
        g.once("destroy", () => this.guilds.delete(guild.id));
        this.guilds.set(guild.id, g);
        return g;
    }

    /**
     * @param {Guild} guild
     */
    hasGuild(guild) {
        return this.guilds.has(guild.id);
    }
}

module.exports = new AudioManager;
module.exports.ConnectError = ConnectError;