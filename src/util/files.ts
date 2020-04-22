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

import fs from "fs";
import path from "path";
import disk from "diskusage";
import log from "../log";

export function walk(dir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        let results: string[] = [];

        fs.readdir(dir, (err, files) => {
            if (err) return reject(err);
            let pending = files.length;
            if (!pending) return resolve(results);

            for (let file of files) {
                file = path.resolve(dir, file);

                fs.stat(file, (err, stat) => {
                    if (err) return reject(err);
                    if (stat && stat.isDirectory()) {
                        walk(file)
                            .then(files => {
                                results = results.concat(files);
                                if (!--pending) resolve(results);
                            })
                            .catch(err => reject(err));
                    } else {
                        results.push(file);
                        if (!--pending) resolve(results);
                    }
                });
            }
        });
    });
}

export async function isEnoughDiskSpace() {
    const info = await disk.check("/");
    const yes = info.available > 1000 * 1000 * 1000;
    if (!yes) log("RUNNING OUT OF DISK SPACE");
    return yes;
}
