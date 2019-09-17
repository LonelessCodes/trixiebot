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

class ListFormat extends Resolvable {
    /**
     * @param {(string|Resolvable)[]} arr
     * @param {Object} [opts]
     * @param {"and" | "or"} [opts.type]
     * @param {"long" | "short"} [opts.style]
     */
    constructor(arr = [], opts = {}) {
        super();
        this.arr = arr;

        opts = Object.assign({ type: "and", style: "long" }, opts);
        this.type = opts.type;
        this.style = opts.style;
    }

    push(...args) {
        this.arr = this.arr.concat(args);
    }

    resolve(i18n) {
        if (this.arr.length === 0) return "";
        const arr = this.arr.map(item => Resolvable.resolve(item, i18n));

        if (arr.length === 1) return arr[0];

        if (this.style === "long") {
            let sep;
            if (this.type === "and") sep = i18n.translate("format.and", "and");
            else if (this.type === "or") sep = i18n.translate("format.or", "or");

            return `${arr.slice(0, -1).join(", ")} ${sep} ${arr[arr.length - 1]}`;
        } else {
            return arr.join(", ");
        }
    }
}

module.exports = ListFormat;
