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

/**
 * The reason why I'm not using the built-in Symbol types is for better debuggibility.
 * Printing the normal Symbol to the console just shows "Symbol()" and doesn't give any
 * reference to which Symbol it is. Everything looks the same. Printing numbers is just
 * way easier to debug
 */

let incr = 0;

export default function Symbol(): number {
    return incr++;
}
