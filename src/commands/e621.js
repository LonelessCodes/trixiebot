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

const { splitArgs } = require("../util/string");
const { findAndRemove } = require("../util/array");
const fetch = require("node-fetch");
const INFO = require("../info");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Translation = require("../modules/i18n/Translation");
const TranslationMerge = require("../modules/i18n/TranslationMerge");

const filter_tags = ["shota", "cub", "self_harm", "suicide", "animal_abuse", "gore", "child_abuse"];

async function fetchImages(params) {
    const scope = params.scope || "index";
    delete params.scope;

    let string = [];
    for (const key in params)
        string.push(key + "=" + params[key]);
    string = string.join("&");

    const url = `https://e621.net/post/${scope}.json?${string}`;

    const response = await fetch(url, {
        timeout: 10000,
        headers: {
            "User-Agent": `TrixieBot/${INFO.VERSION} (by Loneless on e621)`,
        },
    }).then(request => request.json());

    return response;
}

async function process(message, msg, type) {
    let args = splitArgs(msg, 2);

    let popular_order = "week";

    if (/day|week|month/i.test(popular_order) && type === "popular") {
        popular_order = args[0].toLowerCase();
        args = splitArgs(args[1], 2);
    }

    let amount = 1;
    try {
        const numParse = parseInt(args[0]);
        if (typeof numParse === "number" && !Number.isNaN(numParse)) {
            if (numParse < 1 || numParse > 5) {
                return new Translation("derpi.amount_out_range", "`amount` cannot be smaller than 1 or greater than 5!");
            }
            amount = numParse;
        } else throw new Error("NaN Error"); // go catch
    } catch (err) {
        err;
        amount = 1;
        args[1] = args[0] + " " + args[1];
        args[0] = "";
    }

    const tags = args[1].toLowerCase().trim().split(/,?\s+/g);

    if (tags.length === 0) {
        return new Translation("derpi.query_missing", "`query` **must** be given");
    }

    // filter nsfw tags in sfw channel
    if (!message.channel.nsfw) {
        for (const tag of ["rating:e", "rating:q", "rating:explicit", "rating:questionable"])
            findAndRemove(tags, tag);
        tags.push("rating:s");
    }

    // filter tags that are not allowed by the discord community guidelines
    const length_before = tags.length;
    for (const tag of filter_tags) findAndRemove(tags, tag);

    let warning = null;
    if (length_before > tags.length) warning = new Translation("derpi.warning", "The content you were trying to look up violates Discord's Community Guidelines :c I had to filter it, cause I wanna be a good filly");

    switch (type) {
        case "random": tags.push("order:random"); break; // sort randomly
        case "first": tags.push("order:id"); break; // sort by id, ascending
        case "top": tags.push("order:score"); break; // sort by score, descending (why the same syntax has different behaviours? idk man)
    }

    // join to a query string
    const query = tags.join(" ");

    const results = [];
    let result;
    try {
        result = await fetchImages({
            tags: encodeURIComponent(query),
            // we fetch a few more than we actually need, because we can't filter unwanted content
            // on the request level, as e621 doesn't allow more than 6 tags at once (wtf man), so
            // we need some buffer when filtering them post response
            limit: amount * 2,
        });
    } catch (_) {
        return new Translation("e621.error", "❌ There's been an error talking to e621 :'c");
    }
    for (let i = 0; i < Math.min(amount * 2, result.length); i++) {
        if (results.length === amount) break;

        const image = result[i];

        const tags = image.tags.split(/\s+/g);
        if (filter_tags.some(tag => tags.includes(tag))) continue;

        results.push({
            image_url: image.file_url,
            id: image.id,
            artist: image.artist,
        });
    }

    if (results.length === 0) {
        if (!warning) return new Translation("general.not_found", "The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
        return warning;
    }

    return new TranslationMerge(
        warning,
        results.map(result => {
            let str = "";
            if (result.artist) str += `**${result.artist.join(", ")}** `;
            str += `*<https://e621.net/post/show/${result.id}>* `;
            str += result.image_url;
            return str;
        }).join("\n")
    ).separator("\n");
}

module.exports = function install(cr) {
    const e621Command = cr.registerCommand("e621", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Search images on e621. If used in non-nsfw channels, it will only show safe posts. The bot will automatically filter posts containing content violating Discord's Community Guidelines."))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL, true);

    /**
     * SUB COMMANDS
     */

    e621Command.registerSubCommand("random", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(({ message, content }) => process(message, content, "random")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>")
            .addParameterOptional("amount", "number ranging from 1 to 5 for how many results to return")
            .addParameter("query", "a query string. Uses E621's syntax (<https://e621.net/help/show/tags>)"));

    e621Command.registerSubCommand("latest", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(({ message, content }) => process(message, content, "latest")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>"));

    e621Command.registerSubCommand("first", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(({ message, content }) => process(message, content, "first")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>"));

    e621Command.registerSubCommand("top", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(({ message, content }) => process(message, content, "top")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>"));

    e621Command.registerSubCommand("popular", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            let popular_order = "week";

            if (/^day|week|month/i.test(content)) {
                const args = splitArgs(content, 2);
                popular_order = args[0].toLowerCase();
                content = args[1];
            }

            let amount = 1;
            try {
                const numParse = parseInt(content);
                if (typeof numParse === "number" && !Number.isNaN(numParse)) {
                    if (numParse < 1 || numParse > 5) {
                        return new Translation("derpi.amount_out_range", "`amount` cannot be smaller than 1 or greater than 5!");
                    }
                    amount = numParse;
                } else throw new Error("NaN Error"); // go catch
            } catch (err) {
                err;
                amount = 1;
            }

            const result = await fetchImages({
                scope: "popular_by_" + popular_order,
                limit: 100,
            });

            let whileBreak = 100;
            const results = [];
            for (let i = 0; i < Math.min(amount, result.length); i++) {
                if (whileBreak <= 0) break;
                whileBreak--;

                const image = result[i];
                if (!image) break;

                if (!message.channel.nsfw && image.rating !== "s") {
                    i--;
                    continue;
                }

                const tags = image.tags.split(/\s+/g);
                if (filter_tags.some(tag => tags.includes(tag))) {
                    i--;
                    continue;
                }
                results.push({
                    image_url: image.file_url,
                    id: image.id,
                    artist: image.artist,
                });
            }

            if (results.length === 0) {
                return new Translation("general.not_found", "The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
            }

            return results.map(result => {
                let str = "";
                if (result.artist) str += `**${result.artist.join(", ")}** `;
                str += `*<https://e621.net/post/show/${result.id}>* `;
                str += result.image_url;
                return str;
            }).join("\n");
        })).setHelp(new HelpContent()
            .setDescription("Returns the current most popular images by day, week or month.")
            .setUsage("<?timerange> <?amount>")
            .addParameterOptional("timerange", "Popular by 'day', 'week' or 'month'. Default: 'week'"));

    e621Command.registerSubCommandAlias("random", "*");

    cr.registerAlias("e621", "e");
};
