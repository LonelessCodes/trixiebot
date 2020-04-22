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

const config = require("../../config").default;

if (!config.has("database.host") || !config.has("database.port"))
    throw new Error("No DB connection details (host, port) were specified in the configs");
if (!config.has("database.db")) throw new Error("No db name was specified in the configs");

const promise = require("mongodb").MongoClient.connect(
    `mongodb://${config.get("database.host")}:${config.get("database.port")}/`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        auth: config.has("database.auth") && config.get("database.auth"),
    }
);

module.exports = async function db(name = config.get("database.db")) {
    const client = await promise;
    return client.db(name);
};
