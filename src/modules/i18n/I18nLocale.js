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

class I18nLocale {
    constructor(manager, locale) {
        this.manager = manager;
        this.locale = locale;
    }

    /**
     * @param {string} id
     * @param {string|{}} phrase
     * @param {{}} args
     * @returns {string}
     */
    translate(id, phrase, args) {
        return this.manager.translate(this.locale, id, phrase, args);
    }

    /**
     * @param {string} id
     * @param {[string, string]|{ singular: string, plural: string }|{ one: string, other: string }|number} phrase
     * @param {number|{}} count
     * @param {{}} args
     * @returns {string}
     */
    translateN(id, phrase, count, args) {
        return this.manager.translateN(this.locale, id, phrase, count, args);
    }
}

module.exports = I18nLocale;
