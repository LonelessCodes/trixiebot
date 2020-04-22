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

declare type random = (from: number, to: number) => Promise<number>;

// @ts-ignore
import random from "random-number-csprng";

export default async function secureRandom(): Promise<number>;
export default async function secureRandom(num: number): Promise<number>;
export default async function secureRandom<T>(arr: T[]): Promise<T>;
export default async function secureRandom(from: number, to: number): Promise<number>;
export default async function secureRandom<T>(...args: T[]): Promise<number | T> {
    if (args.length === 0) {
        return await random(0, 99) / 100;
    } else if (args.length === 1) {
        const param = args[0];
        if (typeof param === "number") {
            return param <= 1 ? 0 : await random(0, param - 1);
        } else if (param instanceof Array) {
            return param.length <= 1 ? param[0] : param[await random(0, param.length - 1)];
        } else {
            throw new TypeError("First argument should be number or Array");
        }
    } else if (args.length === 2) {
        const from = args[0];
        const to = args[1];
        if (args.length === 2 && typeof from === "number" && typeof to === "number") {
            return from === to ||
                from === to - 1 ? 0 : await random(from, to - 1);
        }
    }
    throw new TypeError("Passed arguments match none of the overloads");
}
