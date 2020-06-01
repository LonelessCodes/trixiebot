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

import fetch from "node-fetch";
import querystring from "querystring";

export interface CalendarificResponse {
    meta: {
        code: number;
    };
    response: {
        holidays: {
            name: string;
            description: string;
            country: {
                id: string;
                name: string;
            };
            date: {
                iso: string;
                datetime: {
                    year: number;
                    month: number;
                    day: number;
                };
            };
            type: string[];
            locations: string;
            states: string;
        }[];
    };
}

export interface CalendarificParameters {
    country: string;
    year: number;
    day?: number;
    month?: number;
    location?: string;
    type?: "national" | "local" | "religious" | "observance";
}

export default class Calendarific {
    public key: string;

    constructor(key: string) {
        this.key = key;
    }

    async holidays(parameters: CalendarificParameters): Promise<CalendarificResponse> {
        const query = querystring.stringify({
            api_key: this.key,
            ...parameters,
        });

        const url = Calendarific.api_endpoint + "?" + query;

        const req = await fetch(url);
        return await req.json();
    }

    static api_endpoint = "https://calendarific.com/api/v2/holidays";
}
