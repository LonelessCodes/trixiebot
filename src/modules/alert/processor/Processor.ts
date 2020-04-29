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

import { EventEmitter } from "events";

import OnlineStream from "../stream/OnlineStream";
import Stream from "../stream/Stream";
import StreamConfig from "../stream/StreamConfig";
import ParsedStream from "../stream/ParsedStream";

export default abstract class Processor extends EventEmitter {
    online: OnlineStream[] = [];

    constructor(public manager: import("../AlertManager").default) {
        super();

        this.on("online", (stream: OnlineStream) => this.online.push(stream));
        this.on("change", (stream: OnlineStream) => {
            const old = this.online.findIndex(old => old.guild.id === stream.guild.id && old.userId === stream.userId);
            if (old >= 0) this.online.splice(old, 1);
            this.online.push(stream);
        });
        this.on("offline", (stream: Stream) => this.removeStream(stream));
    }

    abstract testURL(url: string): boolean;

    abstract async parseStreamer(url: string): Promise<ParsedStream>;

    abstract formatURL(stream: ParsedStream, fat?: boolean): string;

    addStreamConfig(config: StreamConfig) {
        config;
        /* Do nothing */
    }

    removeStreamConfig(config: StreamConfig) {
        this.removeStream(config);
    }

    removeStream(config: StreamConfig) {
        const oldStream = this.online.findIndex(old => old.guild.id === config.guild.id && old.userId === config.userId);
        if (oldStream >= 0) this.online.splice(oldStream, 1);
    }

    abstract readonly url: string;
    abstract readonly name: string;
    abstract readonly display_name: string;
    abstract readonly color: number;
}
