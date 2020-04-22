/*
 * Copyright (C) 2020 Christian Schäfer / Loneless
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

import { I18nLocale } from "./I18n";

export class ResolvableObject<T> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public resolve(i18n: I18nLocale): T {
        return (undefined as unknown) as T;
    }
    public get length() {
        return 0;
    }

    static resolve<T extends any>(item: Resolvable<T>, i18n: I18nLocale): T {
        return item instanceof ResolvableObject ? item.resolve(i18n) : item;
    }
}
export type Resolvable<T> = T | ResolvableObject<T>;
