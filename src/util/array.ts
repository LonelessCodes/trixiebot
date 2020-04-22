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

import secureRandom from "../modules/random/secureRandom";

export function randomItem<T>(arr: T[]): Promise<T> {
    return secureRandom(arr);
}

export function lastItem<T>(arr: T[]): T {
    return arr[arr.length - 1];
}

export function findAndRemove<T>(arr: T[], elem: T) {
    const i = arr.indexOf(elem);
    if (i > -1) arr.splice(i, 1);
}

export function findFirstIndex<T>(arr: T[], finder: (item: T) => boolean) {
    for (let i = 0; i < arr.length; i++) {
        if (finder(arr[i])) return i;
    }
    return arr.length;
}

export function roll<T>(
    array: T[],
    roller: (item: T, index: number, next: () => void) => Promise<void> | void,
    end: () => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        let index = 0;
        const next = () => {
            index++;
            if (index < array.length) {
                const r = roller(array[index], index, next);
                if (r && r.then) r.then(next).catch(reject);
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
        if (r && r.then) r.then(next).catch(reject);
    });
}
