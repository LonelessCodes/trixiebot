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

const { formatter } = require("./i18n_utils");
const Resolvable = require("./Resolvable");

class TranslationFormatter extends Resolvable {
    constructor(id, args = {}) {
        super();
        this.id = id;
        this.args = args;
    }

    resolve(i18n) {
        return formatter(i18n, Resolvable.resolve(this.id, i18n), this.args);
    }
}

module.exports = TranslationFormatter;
