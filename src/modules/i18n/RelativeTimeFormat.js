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
const moment = require("moment");

class RelativeTimeFormat extends Resolvable {
    /**
     * @param {Date|moment} date
     * @param {Object} [opts]
     * @param {"long"|"short"} [style]
     */
    constructor(date, opts = {}) {
        super();
        this.moment = moment(date);
        this.opts = Object.assign({ style: "long" }, opts);
    }

    resolve(i18n) {
        return this.moment.locale(i18n.locale).fromNow(this.opts.style === "short");
    }
}

module.exports = RelativeTimeFormat;
