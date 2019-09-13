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

const Resolvable = require("./Resolvable");
const { formatter } = require("./i18n_utils");

class TranslationPlural extends Resolvable {
    constructor(id, phrase, count, args) {
        super();
        this.id = id;
        this.phrase = phrase;
        this.count = count;
        this.args = args;
    }

    resolve(i18n) {
        return formatter(i18n, i18n.translateN(this.id, this.phrase, this.count), this.args);
    }
}

module.exports = TranslationPlural;
