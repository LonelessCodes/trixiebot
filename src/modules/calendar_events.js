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

const CalendarRange = require("./CalendarRange");
const CalendarStatus = require("./CalendarStatus");

module.exports = [
    // 0-24 Oct. 30th
    new CalendarStatus(new CalendarRange("0 0 0 30 9 *", "0 0 0 31 9 *"), "Happy Halloween!"),
    // 0:00 25th - 24:00 26th Dec
    new CalendarStatus(new CalendarRange("0 0 0 25 11 *", "0 0 0 27 11 *"), "Merry Christmas!"),
    // 18:00 - 24:00 31st Dec
    new CalendarStatus(new CalendarRange("0 0 18 31 11 *", "0 0 0 1 0 *"), "Merry New Year's Eve!"),
    // 0-24 1st Jan
    new CalendarStatus(new CalendarRange("0 0 0 1 0 *", "0 0 0 2 0 *"), "Happy New Year!"),
];
