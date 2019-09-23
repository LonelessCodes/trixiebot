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

const getNextSequence = require("../../modules/getNextSequence");
// eslint-disable-next-line no-unused-vars
const { Message } = require("discord.js");

class ErrorCaseManager {
    constructor(client, db) {
        this.client = client;

        this.db = db;
        this.db_error_cases = this.db.collection("error_cases");
    }

    /**
     * @param {Message} message
     * @param {Error} err
     */
    async collectInfo(message, err) {
        const err_clean = {
            is_error: err instanceof Error,
            name: err.name,
            message: err.message,
            stack: err.stack,
        };

        const doc = {
            _id: "#" + await getNextSequence(this.db, "error_cases"),
            ts: new Date,

            err: err_clean,
            message_id: message.id,
            content: message.content,
            guild_id: message.guild.id,
            guild_large: message.guild.large,
            channel_type: message.channel.type,
            channel_id: message.channel.id,
            user_id: message.author.id,

            memory_usage: process.memoryUsage(),
            uptime: process.uptime(),

            reported: false,
            acknowledged: false,
        };

        await this.db_error_cases.insertOne(doc);

        return doc._id;
    }

    async reportError(caseId) {
        await this.db_error_cases.updateOne({ _id: caseId }, { $set: { reported: true } });
    }

    async acknowledgeError(caseId) {
        await this.db_error_cases.updateOne({ _id: caseId }, { $set: { acknowledged: true } });
    }

    async getErrors() {
        return await this.db_error_cases.find({ reported: true, acknowledged: false }).toArray();
    }
}

module.exports = ErrorCaseManager;
