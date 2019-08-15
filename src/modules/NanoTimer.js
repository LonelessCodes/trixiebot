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

const NS_PER_SEC = 1e9;
const NS_PER_MS = 1e6;

class NanoTimer {
    constructor() {
        /** @type {bigint} */
        this._begin = null;
    }
    begin() {
        this._begin = process.hrtime.bigint();
        return this;
    }
    end() {
        const end = process.hrtime.bigint();
        return Number(end - this._begin);
    }
}

function nanoTimer() {
    return new NanoTimer().begin();
}
nanoTimer.NS_PER_SEC = NS_PER_SEC;
nanoTimer.NS_PER_MS = NS_PER_MS;
nanoTimer.NanoTimer = NanoTimer;

module.exports = nanoTimer;
