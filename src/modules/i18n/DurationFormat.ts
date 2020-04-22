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

import { toHumanTime } from "../../util/time";
import { ResolvableObject } from "./Resolvable";
import moment from "moment";
import I18nLocale from "./I18nLocale";

export interface DurationFormatOptions {
    style?: "long" | "short";
}

export type DurationResolvable = moment.Duration | string | number;

export default class DurationFormat extends ResolvableObject<string> {
    duration: moment.Duration;
    opts: Required<DurationFormatOptions>;

    constructor(duration: DurationResolvable, opts: DurationFormatOptions = {}) {
        super();
        this.duration = moment.duration(duration);
        this.opts = { style: "short", ...opts };
    }

    resolve(i18n: I18nLocale) {
        if (this.opts.style === "long") return this.duration.locale(i18n.locale).humanize(false);
        return toHumanTime(this.duration.asMilliseconds());
    }
}
