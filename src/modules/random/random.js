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

module.exports = function random(...args) {
    if (args.length === 0) {
        return Math.random();
    } else if (args.length === 1) {
        if (typeof args[0] === "number") {
            return args[0] <= 1 ? 0 : Math.random() * args[0];
        } else if (Array.isArray(args[0])) {
            return args[0].length <= 1 ? args[0][0] : args[0][Math.floor(Math.random() * args[0].length)];
        } else {
            throw new Error("First argument should be number or Array");
        }
    } else if (args.length === 2) {
        return args[0] === args[1] ||
            args[0] === args[1] - 1 ? 0 : (Math.random() * (args[1] - args[0])) + args[0];
    }
};
