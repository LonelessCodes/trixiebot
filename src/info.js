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

const path = require("path");
const config = require("./config");
const packageFile = require("../package.json");

const dev = process.env.NODE_ENV === "development";

if (!config.has("user_files_dir")) throw new Error("No user files dir specified in config");

module.exports = Object.freeze({
    WEBSITE: config.has("website_url") ? config.get("website_url") : null,
    INVITE: config.has("invite_url") ? config.get("invite_url") : null,
    VERSION: packageFile.version,
    DEV: dev,
    FILES_BASE: path.resolve(path.join(__dirname, "..", "..", config.get("user_files_dir"))),
    ROOT: path.resolve(path.join(__dirname, "..")),
});
