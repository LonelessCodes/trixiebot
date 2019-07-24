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

const fs = require("fs");
const path = require("path");
const disk = require("diskusage");
const log = require("../log");

class FilesUtils {
    /**
     * @param {string} dir Directory path to walk over
     * @returns {Promise<string[]>}
     */
    walk(dir) {
        return new Promise((resolve, reject) => {
            let results = [];

            fs.readdir(dir, (err, files) => {
                if (err) return reject(err);
                let pending = files.length;
                if (!pending) return resolve(results);

                for (let file of files) {
                    file = path.resolve(dir, file);

                    fs.stat(file, (err, stat) => {
                        if (err) return reject(err);
                        if (stat && stat.isDirectory()) {
                            module.exports.walk(file).then(files => {
                                results = results.concat(files);
                                if (!--pending) resolve(results);
                            }).catch(err => reject(err));
                        } else {
                            results.push(file);
                            if (!--pending) resolve(results);
                        }
                    });
                }
            });
        });
    }

    async isEnoughDiskSpace() {
        const info = await disk.check("/");
        const yes = info.available > 1000 * 1000 * 1000;
        if (!yes) log("RUNNING OUT OF DISK SPACE");
        return yes;
    }
}

module.exports = new FilesUtils;
