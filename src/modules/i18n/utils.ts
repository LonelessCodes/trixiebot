/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

import { Primitive } from "type-fest";
import { Resolvable, ResolvableObject } from "./Resolvable";
import { escapeRegExp } from "../../util/string";
import { I18nLocale } from "./I18n";

export interface FormatArguments {
    [arg: string]: Resolvable<Primitive>;
}

export function formatter(i18n: I18nLocale, msg: string, args: FormatArguments = {}) {
    for (const f in args) {
        msg = msg.replace(new RegExp(`{{\\s*${escapeRegExp(f)}\\s*}}`, "g"), String(ResolvableObject.resolve(args[f], i18n)));
    }
    return msg;
}
