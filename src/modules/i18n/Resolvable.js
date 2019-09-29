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

// eslint-disable-next-line no-unused-vars
const I18nLocale = require("./I18nLocale");

class Resolvable {
    /**
     * @param {I18nLocale} I18n
     * @returns {string}
     */
    resolve() {
        return "";
    }
}
// eslint-disable-next-line valid-jsdoc
/**
 * @type {(item: Resolvable | string | number, arg: I18nLocale) => string}
 */
Resolvable.resolve = function resolve(item, arg) {
    if (typeof item === "number") return String(item);
    if (typeof item === "string") return item;
    if (typeof item.resolve === "function") return item.resolve(arg);
    throw new TypeError("Item is not defined or not number, string or Resolvable");
};

module.exports = Resolvable;