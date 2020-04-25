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

import Discord from "discord.js";
import { EventEmitter } from "events";
import Translation from "../../modules/i18n/Translation";
import { Resolvable } from "../../modules/i18n/Resolvable";

export class AudioConnectError {
    constructor(public message: Resolvable<string>) {}
}

export class AudioGuild extends EventEmitter {
    public client: Discord.Client;
    public guild: Discord.Guild;

    constructor(guild: Discord.Guild) {
        super();

        this._voiceStateUpdate = this._voiceStateUpdate.bind(this);
        this.client = guild.client;
        this.guild = guild;
    }

    private _removeListener() {
        this.client.removeListener("voiceStateUpdate", this._voiceStateUpdate);
    }
    private _attachListener() {
        this._removeListener();
        this.client.addListener("voiceStateUpdate", this._voiceStateUpdate);
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
        return !!this.connection!.dispatcher;
    }

    async connect(member: Discord.GuildMember) {
        if (this.connection) return this.connection;

        let connection: Discord.VoiceConnection;

        // There can be bugs where bot is still part of channel, but lost connection
        if (this.channel) {
            connection = await this.channel.join();
        } else {
            if (!member.voice.channel)
                throw new AudioConnectError(new Translation("audio.join_ch", "You need to join a voice channel first!"));

            const vc = member.voice.channel;

            if (vc.full) throw new AudioConnectError(new Translation("audio.ch_full", "The voice channel you're in is full!"));
            if (!vc.joinable)
                throw new AudioConnectError(
                    new Translation("audio.no_perms_join", "Trixie doesn't have permissions to join the vc you're in")
                );
            if (!vc.speakable)
                throw new AudioConnectError(
                    new Translation("audio.no_perms_speak", "Trixie doesn't have permissions to speak in the vc you're in")
                );

            connection = await vc.join();
        }

        this._attachListener();

        connection.once("disconnect", () => this.leave());
        (connection as any).setSpeaking(0); // as any, so we can use private method setSpeaking()

        this.emit("connected", connection);

        return connection;
    }

    stop() {
        if (!this.playing) return;
        (this.connection!.player as any).destroy();
    }

    leave() {
        this._removeListener();

        if (!this.channel) return;
        this.channel.leave();
        this.emit("leave");
    }

    private _voiceStateUpdate(old_state: Discord.VoiceState, new_state: Discord.VoiceState): void {
        if (!this.channel) return;

        if (old_state.id === this.client.user!.id) {
            if (old_state.channelID && !new_state.channelID) return this.leave();
        } else {
            if (!old_state.channelID) return;
            if (old_state.channelID !== this.channel.id) return;
        }

        if (this.channel.members.filter(m => !m.user.bot).size > 0) return;

        this.leave();
    }
}

export class AudioManager {
    public holds = AudioGuild;
    public cache: Discord.Collection<string, AudioGuild> = new Discord.Collection();

    getGuild(guild: Discord.Guild): AudioGuild {
        let g: AudioGuild | undefined = this.cache.get(guild.id);
        if (g) return g;
        g = new AudioGuild(guild);
        this.cache.set(guild.id, g);
        return g;
    }

    valueOf() {
        return this.cache;
    }
}

export default new AudioManager();
