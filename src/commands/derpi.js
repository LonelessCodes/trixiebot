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

const config = require("../config");
const log = require("../log");
const { splitArgs } = require("../util/string");
const { findAndRemove } = require("../util/array");
const fetch = require("node-fetch");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

//                                                                                               no real gore, but candy gore is allowed
const filter_tags = ["underage", "foalcon", "bulimia", "self harm", "suicide", "animal cruelty", "(gore AND -candy gore)", "foal abuse"];

function getArtist(tags) {
    const arr = tags.split(/,\s*/g);
    for (const tag of arr) {
        if (/^artist:[\w\s]+/gi.test(tag)) {
            const artist = tag.replace(/^artist:/i, "");
            return artist;
        }
    }
}

async function fetchDerpi(params) {
    const scope = params.scope || "search";
    delete params.scope;

    let string = [];
    for (const key in params)
        string.push(key + "=" + params[key]);
    string = string.join("&");

    const url = `https://derpibooru.org/${scope}.json?${string}`;

    const response = await fetch(url, { timeout: 10000 })
        .then(request => request.json());

    return response;
}

async function process(key, message, msg, type) {
    const args = splitArgs(msg, 2);

    let amount = 1;
    try {
        const numParse = parseInt(args[0]);
        if (typeof numParse === "number" && !Number.isNaN(numParse)) {
            if (numParse < 1 || numParse > 5) {
                message.channel.send(await message.channel.translate("`amount` cannot be smaller than 1 or greater than 5!"));
                return;
            }
            amount = numParse;
        } else throw new Error("NaN Error"); // go catch
    } catch (err) {
        err;
        amount = 1;
        args[1] = args[0] + " " + args[1];
        args[0] = "";
    }

    const tags = args[1].toLowerCase().trim().split(/,\s*/g);

    if (tags.length === 0 || (tags.length === 1 && tags[0] === "")) {
        await message.channel.sendTranslated("`query` **must** be given");
        return;
    }

    // filter nsfw tags in sfw channel
    if (!message.channel.nsfw) {
        for (const tag of ["explicit", "questionable", "suggestive", "grimdark", "semi-grimdark", "grotesque"])
            findAndRemove(tags, tag);
        tags.push("safe");
    }

    // filter tags that are not allowed by the discord community guidelines
    const length_before = tags.length;
    for (const tag of filter_tags) findAndRemove(tags, tag);

    let warning = "";
    if (length_before > tags.length) warning = "The content you were trying to look up violates Discord's Community Guidelines :c I had to filter it, cause I wanna be a good filly\n";
    tags.push(...filter_tags.map(tag => "-" + tag));

    // join to a query string
    const query = tags.map(t => encodeURIComponent(t)).join(",").replace(/\s+/g, "+");

    const results = [];
    const promises = [];
    let responses = [];
    let result;
    switch (type) {
        case "first":
            result = await fetchDerpi({
                q: query,
                sf: "id",
                sd: "asc",
                perpage: amount,
                key,
            });
            if (!result.search) break;
            for (let i = 0; i < Math.min(amount, result.search.length); i++) {
                const image = result.search[i];
                results.push({
                    image_url: image.representations.large,
                    id: image.id,
                    artist: getArtist(image.tags),
                });
            }
            break;
        case "latest":
            result = await fetchDerpi({
                q: query,
                sf: "id",
                sd: "desc",
                perpage: amount,
                key,
            });
            if (!result.search) break;
            for (let i = 0; i < Math.min(amount, result.search.length); i++) {
                const image = result.search[i];
                results.push({
                    image_url: image.representations.large,
                    id: image.id,
                    artist: getArtist(image.tags),
                });
            }
            break;
        case "top":
            result = await fetchDerpi({
                q: query,
                sf: "score",
                sd: "desc",
                perpage: amount,
                key,
            });
            if (!result.search) break;
            for (let i = 0; i < Math.min(amount, result.search.length); i++) {
                const image = result.search[i];
                results.push({
                    image_url: image.representations.large,
                    id: image.id,
                    artist: getArtist(image.tags),
                });
            }
            break;
        case "random":
            result = await fetchDerpi({
                q: query,
                key,
            });
            if (!result.total) break;
            for (let i = 0; i < Math.min(amount, result.total); i++) {
                const promise = fetchDerpi({
                    q: query,
                    random_image: "true",
                    key,
                }).then(response => fetchDerpi({
                    scope: response.id,
                    key,
                }));
                promises.push(promise);
            }
            responses = await Promise.all(promises);

            for (const image of responses) {
                results.push({
                    image_url: image.representations.large,
                    id: image.id,
                    artist: getArtist(image.tags),
                });
            }
            break;
    }

    if (results.length === 0) {
        if (warning === "") await message.channel.sendTranslated("The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
        else await message.channel.sendTranslated(warning);
        return;
    }

    /*
    Credit MUST always be given to the site in the form of a link.

    If images are used, the artist MUST always be credited (if provided)
    and the original source URL MUST be displayed alongside the image,
    either in textual form or as a link. A link to the Derpibooru page
    is optional but recommended; we recommend the derpibooru.org domain
    as a canonical domain. The https protocol MUST be specified on all
    URIs; Derpibooru does not support plaintext HTTP connections.

    (from Derpibooru API License)
    */

    const output = warning + results.map(result => {
        let str = "";
        if (result.artist) str += `**${result.artist}** `;
        str += `*<https://derpibooru.org/${result.id}>* `;
        str += `https:${result.image_url}`;
        return str;
    }).join("\n");

    await message.channel.send(output);
}

module.exports = function install(cr) {
    if (!config.has("derpibooru.key")) return log.namespace("config", "Found no API token for Derpibooru - Disabled horsepussy command");

    const key = config.get("derpibooru.key");

    const derpiCommand = cr.registerCommand("derpi", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Search images on Derpibooru. If used in non-nsfw channels, it will only show safe posts. The bot will automatically filter posts containing content violating Discord's Community Guidelines."))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL, true);

    /**
     * SUB COMMANDS
     */

    derpiCommand.registerSubCommand("random", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand((message, msg) => process(key, message, msg, "random")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>")
            .addParameterOptional("amount", "number ranging from 1 to 5 for how many results to return")
            .addParameter("query", "a query string. Uses Derpibooru's syntax (<https://derpibooru.org/search/syntax>)"));

    derpiCommand.registerSubCommand("top", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand((message, msg) => process(key, message, msg, "top")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>"));

    derpiCommand.registerSubCommand("latest", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand((message, msg) => process(key, message, msg, "latest")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>"));

    derpiCommand.registerSubCommand("first", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand((message, msg) => process(key, message, msg, "first")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>"));

    derpiCommand.registerSubCommandAlias("random", "*");
    cr.registerAlias("derpi", "db");
};
