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

import secureRandom from "./secureRandom";

export default class RandomChance<T> {
    array: T[] = [];

    /**
     * Add items to the chances
     * @param {any} item
     * @param {number} distribution
     * @returns {RandomChance<T>}
     */
    add(item: T, distribution: number = 1): this {
        for (let i = 0; i < distribution; i++) this.array.push(item);
        return this;
    }

    /**
     * Pick a random item from the chances list
     * @returns {Promise<T>}
     */
    random(): Promise<T> {
        return secureRandom(this.array);
    }
}
