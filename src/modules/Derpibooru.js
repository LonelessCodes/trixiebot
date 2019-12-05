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

const INFO = require("../info");
const qs = require("querystring");
const fetch = require("node-fetch");

class Derpibooru {
    constructor(key) {
        this.key = key;
    }

    fetch(scope, tags, params) {
        return Derpibooru.fetch(this.key, scope, tags, params);
    }

    fetchAll(scope, tags, params) {
        return Derpibooru.fetchAll(this.key, scope, tags, params);
    }

    static async fetch(key, scope, tags, params = {}) {
        if (scope === "search" && tags) {
            if (!Array.isArray(tags)) {
                params = tags;
                tags = undefined;
            } else {
                params["q"] = Derpibooru.encodeTags(tags);
            }
        }

        const url = `https://derpibooru.org/${scope}.json?${qs.stringify({ key, ...params })}`;

        return await fetch(url, {
            timeout: 10000,
            headers: {
                "User-Agent": `TrixieBot (${INFO.VERSION})`,
            },
        }).then(request => request.json());
    }

    static async fetchAll(key, scope, tags, params = {}) {
        if (scope !== "search") throw new Error("Scope of other than 'search' is not supported");
        if (!tags) throw new Error("Search criteria must be specified");
        if (!Array.isArray(tags)) {
            params = tags;
            tags = undefined;
        } else params["q"] = Derpibooru.encodeTags(tags);
        if (typeof params["start_at"] !== "string") throw new TypeError("params.start_at must be set!");

        const orig_q = params["q"];
        let last_val = params["start_at"];
        delete params["start_at"];

        const sf = params.sf;
        const sd = params.sd;

        let results = [];
        let total = 0;

        do {
            if (sd === "asc") params["q"] = `${orig_q},${sf}.gt:${last_val}`;
            else params["q"] = `${orig_q},${sf}.lt:${last_val}`;

            const result = await Derpibooru.fetch(key, scope, params);
            total = result.total;

            if (result.search.length === 0) break;

            if (sd === "asc") {
                if (!(sf in result.search[result.search.length - 1])) throw new Error("param.sf '" + sf + "' does not exist on image object");

                last_val = String(result.search[result.search.length - 1][sf]);
            } else {
                if (!(sf in result.search[0])) throw new Error("param.sf '" + sf + "' does not exist on image object");

                last_val = String(result.search[0][sf]);
            }

            results = results.concat(result.search);
        } while (total > 0);

        return results;
    }

    static encodeTags(tags) {
        return tags.join(",");
    }

    static getArtists(tags) {
        const artists = [];
        const arr = typeof tags === "string" ? tags.split(/,\s*/g) : tags;
        for (const tag of arr) {
            if (/^artist:[\w\s]+/gi.test(tag)) {
                artists.push(tag.replace(/^artist:\s*/i, ""));
            }
        }
        return artists;
    }
}

module.exports = Derpibooru;
