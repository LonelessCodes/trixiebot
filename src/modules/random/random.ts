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

export default function random(): number;
export default function random(num: number): number;
export default function random<T>(arr: T[]): T;
export default function random(from: number, to: number): number;
export default function random<T>(...args: T[]): number | T {
    if (args.length === 0) {
        return Math.random();
    } else if (args.length === 1) {
        const param = args[0];
        if (typeof param === "number") {
            return param <= 1 ? 0 : Math.random() * param;
        } else if (Array.isArray(param)) {
            return param.length <= 1
                ? param[0]
                : param[Math.floor(Math.random() * param.length)];
        }
        throw new TypeError("First argument should be number or Array");
    } else if (args.length === 2) {
        const from = args[0];
        const to = args[1];
        if (args.length === 2 && typeof from === "number" && typeof to === "number") {
            // eslint-disable-next-line no-mixed-operators
            return from === to || from === to - 1 ? 0 : Math.random() * (to - from) + from;
        }
    }
    throw new TypeError("Passed arguments match none of the overloads");
}
