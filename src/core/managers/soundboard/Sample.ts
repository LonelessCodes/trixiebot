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

import path from "path";
import fs from "fs-extra";
import Discord from "discord.js";
import { Collection } from "mongodb";

export interface SampleOptions {
    name: string;
    plays: number;
    filename: string;
    created_at: Date;
    modified_at: Date;
    last_played_at: Date;
}

export abstract class Sample {
    readonly importable: boolean = false;

    manager: typeof import("../SoundboardManager");
    db: Promise<Collection>;

    id: string | null = null;
    name: string;
    plays: number;
    filename: string;
    created_at: Date;
    modified_at: Date;
    last_played_at: Date;

    constructor(manager: typeof import("../SoundboardManager"), doc: SampleOptions) {
        this.manager = manager;

        this.db = manager.samples;

        this.name = doc.name;
        this.plays = doc.plays;
        this.filename = doc.filename;
        this.created_at = doc.created_at;
        this.modified_at = doc.modified_at;
        this.last_played_at = doc.last_played_at;
    }

    abstract get file(): string;

    protected _play(connection: Discord.VoiceConnection): Discord.StreamDispatcher {
        const dispatcher = connection.play(fs.createReadStream(this.file), { type: "ogg/opus", volume: false });
        dispatcher.once("start", () => {
            (connection.player as any).streamingData.pausedTime = 0;
        });
        return dispatcher;
    }

    abstract play(connection: Discord.VoiceConnection): Promise<Discord.StreamDispatcher>;
}

export class PredefinedSample extends Sample {
    readonly importable = false;

    constructor(manager: typeof import("../SoundboardManager"), doc: SampleOptions) {
        super(manager, doc);

        this.db = manager.predefined;
    }

    get file() {
        return path.join(this.manager.BASE, "predefined", this.name + ".ogg");
    }

    async play(connection: Discord.VoiceConnection) {
        const dispatcher = this._play(connection);
        await this.db.then(db => db.updateOne({ name: this.name }, { $inc: { plays: 1 }, $set: { last_played_at: new Date() } }));
        return dispatcher;
    }

    isOwner() {
        return true;
    }
    isGuild() {
        return true;
    }
}

export interface CustomSampleOptions extends SampleOptions {
    id: string;
    owners: string[];
    guilds: string[];
}

export abstract class CustomSample extends Sample {
    readonly importable = true;

    id: string;
    owners: string[];
    guilds: string[];

    constructor(manager: typeof import("../SoundboardManager"), doc: CustomSampleOptions) {
        super(manager, doc);

        this.id = doc.id;
        this.owners = doc.owners;
        this.guilds = doc.guilds;
    }

    get file() {
        return path.join(this.manager.BASE, this.id + ".ogg");
    }

    async play(connection: Discord.VoiceConnection) {
        const dispatcher = this._play(connection);
        await this.db.then(db => db.updateOne({ id: this.id }, { $inc: { plays: 1 }, $set: { last_played_at: new Date() } }));
        return dispatcher;
    }

    isOwner(user: Discord.User): boolean {
        return this.owners.some(id => id === user.id);
    }
    isGuild(guild: Discord.Guild): boolean {
        return this.guilds.some(id => id === guild.id);
    }
}

export interface UserSampleOptions extends CustomSampleOptions {
    creator: string;
}

export class UserSample extends CustomSample {
    creator: string;

    constructor(manager: typeof import("../SoundboardManager"), doc: UserSampleOptions) {
        super(manager, doc);

        this.creator = doc.creator;
    }

    isCreator(user: Discord.User): boolean {
        return this.creator === user.id;
    }
}

export interface GuildSampleOptions extends CustomSampleOptions {
    guild: string;
}

export class GuildSample extends CustomSample {
    guild: string;

    constructor(manager: typeof import("../SoundboardManager"), doc: GuildSampleOptions) {
        super(manager, doc);

        this.guild = doc.guild;
    }

    isCreator(guild: Discord.Guild): boolean {
        return this.guild === guild.id;
    }
}
