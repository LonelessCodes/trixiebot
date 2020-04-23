// @ts-nocheck
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

const fs = require("fs-extra");
const path = require("path");

module.exports = async function getChangelog() {
    const p = path.join(__dirname, "..", "..", "CHANGELOG.md");
    if (!(await fs.exists(p))) return [];

    const file = await fs.readFile(p, "utf8");

    const releases = [];

    /** @type {RegExpExecArray} */
    let match;
    let version;
    let date;
    let body = "";

    for (const line of file.split(/\r?\n/g)) {
        if ((match = /^##? \[(\d+\.\d+\.\d+)\]\(http[\w+.:/]+\) \((\d{4}-\d{2}-\d{2})\)/g.exec(line))) {
            if (version && date) {
                releases.push({
                    body: body.trim(),
                    version,
                    date,
                });
            }
            body = "";
            version = match[1];
            date = match[2];
        } else if (!/^<a name="\d+.\d+.\d+\w?"><\/a>/g.test(line)) {
            body += line.replace(/\(\[[\w]{7}\]\(http[\w+.:/]+\)\)/g, "") + "\n";
        }
    }

    return releases;
};
