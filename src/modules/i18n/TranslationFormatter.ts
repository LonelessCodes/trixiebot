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

import { formatter, FormatArguments } from "./utils";
import { ResolvableObject, Resolvable } from "./Resolvable";
import { I18nLocale } from "./I18n";

export default class TranslationFormatter extends ResolvableObject<string> {
    constructor(public msg: Resolvable<string>, public args: FormatArguments = {}) {
        super();
    }

    resolve(i18n: I18nLocale): string {
        return formatter(i18n, ResolvableObject.resolve(this.msg, i18n), this.args);
    }
}
