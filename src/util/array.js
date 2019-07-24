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

const secureRandom = require("../modules/random/secureRandom");

module.exports = new class ArrayUtils {
    randomItem(arr) {
        return secureRandom(arr);
    }

    lastItem(arr) {
        return arr[arr.length - 1];
    }

    findAndRemove(arr, elem) {
        const i = arr.indexOf(elem);
        if (i > -1) arr.splice(i, 1);
    }

    roll(array, roller, end) {
        return new Promise(resolve => {
            let index = 0;
            const next = () => {
                index++;
                if (index < array.length) {
                    const r = roller(array[index], index, () => next());
                    if (r.then) r.then(() => next());
                } else if (end) {
                    end();
                    resolve();
                }
            };
            if (array.length === 0) {
                if (end) end();
                resolve();
                return;
            }
            const r = roller(array[index], index, next);
            if (r.then) r.then(next);
        });
    }
};
