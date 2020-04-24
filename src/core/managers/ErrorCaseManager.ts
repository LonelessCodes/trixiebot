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
import { Collection, Db } from "mongodb";
import getNextSequence from "../../modules/db/getNextSequence";

export type CaseId = string;

export interface ErrorCase {
    _id: CaseId;
    ts: Date;

    err: {
        is_error: boolean;
        name: string;
        message: string;
        stack?: string;
    };
    message_id: Discord.Snowflake;
    content: string;
    guild_id?: Discord.Snowflake | null;
    guild_large: boolean;
    channel_type: Exclude<keyof typeof ChannelType, "voice" | "category" | "store">;
    channel_id: Discord.Snowflake;
    user_id: Discord.Snowflake;

    memory_usage: NodeJS.MemoryUsage;
    uptime: number;

    reported: boolean;
    acknowledged: boolean;
}

export default class ErrorCaseManager {
    public db_client: Db;
    public db: Collection<ErrorCase>;

    constructor(db: Db) {
        this.db_client = db;
        this.db = db.collection("error_cases");
    }

    /**
     * @param {Message} message
     * @param {Error} err
     */
    async collectInfo(message: Discord.Message, err: Error): Promise<CaseId> {
        const doc: ErrorCase = {
            ts: new Date(),
            err: {
                is_error: err instanceof Error,
                name: err.name,
                message: err.message,
                stack: err.stack,
            },
            message_id: message.id,
            content: message.content,
            guild_id: message.guild && message.guild.id,
            guild_large: message.guild ? message.guild.large : false,
            channel_type: message.channel.type,
            channel_id: message.channel.id,
            user_id: message.author.id,

            memory_usage: process.memoryUsage(),
            uptime: process.uptime(),

            reported: false,
            acknowledged: false,

            _id: "#" + (await getNextSequence(this.db_client, "error_cases")),
        };

        await this.db.insertOne(doc);
        return doc._id;
    }

    async reportError(caseId: CaseId) {
        await this.db.updateOne({ _id: caseId }, { $set: { reported: true } });
    }

    async acknowledgeError(caseId: CaseId) {
        await this.db.updateOne({ _id: caseId }, { $set: { acknowledged: true } });
    }

    async getErrors() {
        return await this.db.find({ reported: true, acknowledged: false }).toArray();
    }
}
