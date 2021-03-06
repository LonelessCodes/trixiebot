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

import { ResolvableObject } from "./Resolvable";
import { I18nLocale } from "./I18n";
import moment from "moment";

export type DateResolvable = moment.Moment | Date | string | number;

export default class CalendarTimeFormat extends ResolvableObject<string> {
    date: moment.Moment;

    constructor(date: DateResolvable) {
        super();
        this.date = moment(date);
    }

    resolve(i18n: I18nLocale) {
        return this.date.locale(i18n.locale).calendar();
    }
}
