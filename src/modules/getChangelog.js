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

const fs = require("fs-extra");
const path = require("path");

module.exports = async function getChangelog() {
    const p = path.join(__dirname, "..", "..", "CHANGELOG.md");
    if (!await fs.exists(p)) return [];

    const file = await fs.readFile(p, "utf8");

    const commits = file.split(/<a name="\d+.\d+.\d+\w?"><\/a>/g).slice(1);

    const clean = commits.map(commit => {
        const body = commit
            .replace(/\(\[[\w\d]{7}\]\(http.+\)\)/g, "")
            .replace(/\(http[^(]*\)/g, "");
        return {
            body: body.replace(/##? \[\d+.\d+.\d+\w?\] \(\d{4}-\d{2}-\d{2}\)/g, "").trim(),
            version: /##? \[(\d+.\d+.\d+\w?)\]/g.exec(body)[1],
            date: /##? \[\d+.\d+.\d+\w?\] \((\d{4}-\d{2}-\d{2})\)/g.exec(body)[1],
        };
    });

    return clean;
};
