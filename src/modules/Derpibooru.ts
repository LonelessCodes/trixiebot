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

import INFO from "../info";
import random from "./random/secureRandom";
import { stringify } from "querystring";
import fetch from "node-fetch";

interface Params {
    [key: string]: string | number | boolean | undefined;
}

interface ImageResponse {
    images: Image[];
    interactions: any[];
    total: number;
}

interface Image {
    aspect_ratio: number;
    comment_count: number;
    created_at: string;
    deletion_reason: string | null;
    description: string;
    downvotes: number;
    duplicate_of: number | null;
    faves: number;
    first_seen_at: string;
    format: string;
    height: number;
    hidden_from_users: boolean;
    id: number;
    intensities: { ne: number; nw: number; se: number; sw: number } | null;
    mime_type: "image/gif" | "image/jpeg" | "image/png" | "image/svg+xml" | "video/webm";
    name: string;
    orig_sha512_hash: string;
    processed: boolean;
    representations: {
        [Key in "full" | "large" | "medium" | "small" | "tall" | "thumb" | "thumb_small" | "thumb_tiny"]: string;
    };
    score: number;
    sha512_hash: string;
    source_url: string;
    spoilered: boolean;
    tag_count: number;
    tag_ids: number[];
    tags: string[];
    thumbnails_generated: boolean;
    updated_at: string;
    uploader: string | null;
    uploader_id: number | null;
    upvotes: number;
    view_url: string;
    width: number;
    wilson_score: number;
}

export default class Derpibooru {
    public key: string;

    constructor(key: string) {
        this.key = key;
    }

    random(tags: string[]) {
        return Derpibooru.random(this.key, tags);
    }

    search(tags: string[], params: Params = {}) {
        return Derpibooru.search(this.key, tags, params);
    }

    fetch(scope: string, params: Params) {
        return Derpibooru.fetch(this.key, scope, params);
    }

    searchAll(tags: string[], params: Params = {}) {
        return this.fetchAll("search/images", {
            q: Derpibooru.encodeTags(tags),
            ...params,
        });
    }

    fetchAll(scope: string, params: Params) {
        return Derpibooru.fetchAll(this.key, scope, params);
    }

    static async random(key: string, tags: string[]) {
        const result = await Derpibooru.search(key, tags, { per_page: 1 });
        if (!result.total) return;

        // the random_image parameter was removed, so we'll just make
        // our own random function by n times visiting a random search page
        const page = await random(result.total);

        const response = await Derpibooru.search(key, tags, {
            page: page,
            per_page: 1,
        });

        return response.images && response.images[0];
    }

    static search(key: string, tags: string[], params: Params = {}) {
        return Derpibooru.fetch(key, "search/images", {
            q: Derpibooru.encodeTags(tags),
            ...params,
        }) as Promise<ImageResponse>;
    }

    static async fetch(key: string, scope: string, params: Params = {}) {
        const path = scope.replace(/:([\w_]+)/, (s, name) => {
            if (typeof params[name] !== "undefined") {
                const val = String(params[name]);
                delete params[name];
                return val;
            }
            return s;
        });
        const url = `${Derpibooru.BASE}${path}?${stringify({ key, ...params })}`;

        return await fetch(url, {
            timeout: 10000,
            headers: {
                "User-Agent": `TrixieBot (${INFO.VERSION})`,
            },
        }).then(request => request.json());
    }

    static async fetchAll(key: string, scope: string, params: Params & { sf?: string; sd?: "asc" | "desc" } = {}) {
        if (scope !== "search/images") throw new Error("Scope of other than 'search' is not supported");
        if (!params["q"]) throw new Error("Search criteria must be specified");
        if (typeof params["start_at"] !== "string") throw new TypeError("params.start_at must be set!");

        const orig_q = params["q"];
        let last_val = params["start_at"];
        delete params["start_at"];

        const sf = params.sf || "id";
        const sd = params.sd || "asc";

        let results: Image[] = [];
        let total = 0;

        do {
            if (sd === "asc") params["q"] = `${orig_q},${sf}.gt:${last_val}`;
            else params["q"] = `${orig_q},${sf}.lt:${last_val}`;

            const result = await Derpibooru.fetch(key, scope, params);
            total = result.total;

            if (result.images.length === 0) break;

            if (sd === "asc") {
                if (!(sf in result.images[result.images.length - 1]))
                    throw new Error("param.sf '" + sf + "' does not exist on image object");

                last_val = String(result.images[result.images.length - 1][sf]);
            } else {
                if (!(sf in result.images[0])) throw new Error("param.sf '" + sf + "' does not exist on image object");

                last_val = String(result.images[0][sf]);
            }

            results = results.concat(result.images);
        } while (total > 0);

        return results;
    }

    static encodeTags(tags: string[]) {
        return tags.join(",");
    }

    static getArtists(tags: string | string[]) {
        const artists = [];
        const arr = typeof tags === "string" ? tags.split(/,\s*/g) : tags;
        for (const tag of arr) {
            if (/^artist:[\w\s]+/gi.test(tag)) {
                artists.push(tag.replace(/^artist:\s*/i, ""));
            }
        }
        return artists;
    }

    static BASE = "https://derpibooru.org/api/v1/json/";
}
