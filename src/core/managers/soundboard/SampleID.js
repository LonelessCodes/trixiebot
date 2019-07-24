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

const nanoid = require("nanoid/generate");

class SampleID {
    /**
     * Checks if a string is a valid SampleID string
     * @param {string} id
     * @returns {boolean}
     */
    static isId(id) {
        return SampleID.REGEX.test(id);
    }

    static generate() {
        return SampleID.PREFIX + nanoid(SampleID.CHARSET, SampleID.LENGTH);
    }
}
SampleID.PREFIX = "i";
SampleID.CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";
SampleID.LENGTH = 6;
SampleID.REGEX = new RegExp(`^${SampleID.PREFIX}[${SampleID.CHARSET}]{${SampleID.LENGTH}}$`);

module.exports = SampleID;
