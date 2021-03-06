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
import { ObjectId } from "mongodb";
import ParsedStream from "./ParsedStream";

export interface StreamConfigOptions {
    _id?: ObjectId;
    username: string;
    userId: string;
}

export default class StreamConfig extends ParsedStream implements StreamConfigOptions {
    public channel: Discord.TextChannel | null;
    public nsfwChannel: Discord.TextChannel | null;
    public sfwChannel: Discord.TextChannel | null;
    public guild: Discord.Guild;

    public _id?: ObjectId;
    public username: string;
    public userId: string;

    constructor(
        service: import("../processor/Processor").default,
        channel: Discord.TextChannel | null,
        nsfwChannel: Discord.TextChannel | null,
        sfwChannel: Discord.TextChannel | null,
        guild: Discord.Guild,
        conf: StreamConfigOptions
    ) {
        super(service, conf.username, conf.userId);

        this.channel = channel;
        this.nsfwChannel = nsfwChannel;
        this.sfwChannel = sfwChannel;
        this.guild = guild;

        this._id = conf._id;
        this.username = conf.username;
        this.userId = conf.userId;
    }

    public getChannel(nsfw: boolean): Discord.TextChannel | undefined {
        if (nsfw) {
            if (this.channel) return this.channel;
            if (this.nsfwChannel) return this.nsfwChannel;
        } else {
            if (this.channel) return this.channel;
            if (this.sfwChannel) return this.sfwChannel;
        }
    }

    public getSendable(nsfw: boolean): boolean {
        return !!this.getChannel(nsfw);
    }
}
