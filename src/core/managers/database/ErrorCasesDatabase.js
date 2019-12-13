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
const Mongo = require("mongodb");
const getNextSequence = require("../../../modules/db/getNextSequence");

class ErrorCasesDatabase {
    /**
     * @param {Mongo.Db} db
     */
    constructor(db) {
        this.db_client = db;
        this.db = this.db_client.collection("error_cases");
    }

    async addError(doc) {
        const _id = "#" + await getNextSequence(this.db_client, "error_cases");
        await this.db.insertOne({
            ts: new Date, ...doc, _id,

            reported: false,
            acknowledged: false,
        });
        return _id;
    }

    async reportError(caseId) {
        await this.db.updateOne({ _id: caseId }, { $set: { reported: true } });
    }

    async acknowledgeError(caseId) {
        await this.db.updateOne({ _id: caseId }, { $set: { acknowledged: true } });
    }

    async getErrors() {
        return await this.db.find({ reported: true, acknowledged: false }).toArray();
    }
}

module.exports = ErrorCasesDatabase;
