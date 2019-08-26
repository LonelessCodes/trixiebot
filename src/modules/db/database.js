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

const { MongoClient } = require("mongodb");
const config = require("../../config");

if (!config.has("database.host") || !config.has("database.port"))
    throw new Error("No DB connection details (host, port) were specified in the configs");
if (!config.has("database.db"))
    throw new Error("No db name was specified in the configs");

const opts = {
    autoReconnect: true,
    useNewUrlParser: true,
};
if (config.has("database.auth")) opts.auth = config.get("database.auth");

const database = MongoClient
    .connect(`mongodb://${config.get("database.host")}:${config.get("database.port")}/`, opts);

module.exports = function db(name = config.get("database.db")) {
    return database.then(client => client.db(name));
};
module.exports.client = database;
