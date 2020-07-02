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

const config = require("../config").default;
const log = require("../log").default;
const random = require("../modules/random/secureRandom").default;
const { splitArgs } = require("../util/string");
const { findAndRemove } = require("../util/array");
const Derpibooru = require("../modules/Derpibooru").default;

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const DeprecationCommand = require("../core/commands/DeprecationCommand");
const TreeCommand = require("../core/commands/TreeCommand").default;
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const CommandScope = require("../util/commands/CommandScope").default;

const Translation = require("../modules/i18n/Translation").default;
const TranslationMerge = require("../modules/i18n/TranslationMerge").default;

// no real gore, but candy gore is allowed
const filter_tags = [
    "underage",
    "foalcon",
    "bulimia",
    "self harm",
    "suicide",
    "animal cruelty",
    "(gore AND -candy gore)",
    "foal abuse",
];

async function getEm(key, type, amount, tags) {
    const derpi = new Derpibooru(key);

    const results = [];
    switch (type) {
        case "first": {
            const result = await derpi.search(tags, {
                sf: "id",
                sd: "asc",
                per_page: amount,
            });
            if (!result.images) break;
            for (let i = 0; i < Math.min(amount, result.images.length); i++) {
                const image = result.images[i];
                results.push({
                    image_url: image.representations.full,
                    id: image.id,
                    artists: Derpibooru.getArtists(image.tags),
                });
            }
            break;
        }
        case "latest": {
            const result = await derpi.search(tags, {
                sf: "id",
                sd: "desc",
                per_page: amount,
            });
            if (!result.images) break;
            for (let i = 0; i < Math.min(amount, result.images.length); i++) {
                const image = result.images[i];
                results.push({
                    image_url: image.representations.full,
                    id: image.id,
                    artists: Derpibooru.getArtists(image.tags),
                });
            }
            break;
        }
        case "top": {
            const result = await derpi.search(tags, {
                sf: "score",
                sd: "desc",
                per_page: amount,
            });
            if (!result.images) break;
            for (let i = 0; i < Math.min(amount, result.images.length); i++) {
                const image = result.images[i];
                results.push({
                    image_url: image.representations.full,
                    id: image.id,
                    artists: Derpibooru.getArtists(image.tags),
                });
            }
            break;
        }
        case "random": {
            const result = await derpi.search(tags, { per_page: 1 });
            if (!result.total) break;

            const random_values = [];

            const promises = [];
            for (let i = 0; i < Math.min(amount, result.total); i++) {
                // the random_image parameter was removed, so we'll just make
                // our own random function by n times visiting a random search page
                let page;
                do page = await random(result.total);
                while (random_values.includes(page));
                random_values.push(page);

                const promise = derpi.search(tags, {
                    page: page,
                    per_page: 1,
                });
                promises.push(promise);
            }

            for (const response of await Promise.all(promises)) {
                const image = response.images && response.images[0];
                if (!image) continue;
                results.push({
                    image_url: image.representations.full,
                    id: image.id,
                    artists: Derpibooru.getArtists(image.tags),
                });
            }
            break;
        }
    }

    return results;
}

async function process(key, message, msg, type) {
    const args = splitArgs(msg, 2);

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

    const tags = args[1].trim().split(/,\s*/g);

    if (tags.length === 0 || (tags.length === 1 && tags[0] === "")) {
        return new Translation("derpi.query_missing", "`query` **must** be given");
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

    let warning;
    if (length_before > tags.length)
        warning = new Translation(
            "derpi.warning",
            "The content you were trying to look up violates Discord's Community Guidelines :c I had to filter it, cause I wanna be a good filly"
        );
    tags.push(...filter_tags.map(tag => "-" + tag));

    const results = await getEm(key, type, amount, tags);

    if (results.length === 0) {
        if (!warning)
            return new Translation(
                "general.not_found",
                "The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it..."
            );
        return warning;
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

    return new TranslationMerge(
        warning,
        results
            .map(result => {
                let str = "";
                if (result.artists.length) {
                    if (result.artists.length < 4) str += result.artists.map(a => `**${a}**`).join(", ") + " ";
                    else str += result.artists.slice(0, 3).map(a => `**${a}**`).join(", ") + ", ... ";
                }
                str += `*<https://derpibooru.org/images/${result.id}>* `;
                str += result.image_url;
                return str;
            })
            .join("\n")
    ).separator("\n");
}

module.exports = function install(cr) {
    if (!config.has("derpibooru.key"))
        return log.namespace("config", "Found no API token for Derpibooru - Disabled horsepussy command");

    const key = config.get("derpibooru.key");

    cr.registerCommand("derpi", new DeprecationCommand(
        "*Until Derpibooru has resolved their guidelines on hateful ideologies and hatespeech to something TrixieBot can identify with, all features relying on Derpibooru are going to be unavailable.*"
    ))
        .setHelp(
            new HelpContent().setDescription(
                "Search images on Derpibooru. If used in non-nsfw channels, it will only show safe posts. The bot will automatically filter posts containing content violating Discord's Community Guidelines."
            )
        )
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL, true);

    return;

    const derpiCommand = cr
        .registerCommand("derpi", new TreeCommand())
        .setHelp(
            new HelpContent().setDescription(
                "Search images on Derpibooru. If used in non-nsfw channels, it will only show safe posts. The bot will automatically filter posts containing content violating Discord's Community Guidelines."
            )
        )
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL, true);

    /**
     * SUB COMMANDS
     */

    derpiCommand
        .registerSubCommand("random", new OverloadCommand())
        .registerOverload("1+", new SimpleCommand(({ message, content }) => process(key, message, content, "random")))
        .setHelp(
            new HelpContent()
                .setUsage("<?amount> <query>")
                .addParameterOptional("amount", "number ranging from 1 to 5 for how many results to return")
                .addParameter("query", "a query string. Uses Derpibooru's syntax (<https://derpibooru.org/search/syntax>)")
        );

    derpiCommand
        .registerSubCommand("top", new OverloadCommand())
        .registerOverload("1+", new SimpleCommand(({ message, content }) => process(key, message, content, "top")))
        .setHelp(new HelpContent().setUsage("<?amount> <query>"));

    derpiCommand
        .registerSubCommand("latest", new OverloadCommand())
        .registerOverload("1+", new SimpleCommand(({ message, content }) => process(key, message, content, "latest")))
        .setHelp(new HelpContent().setUsage("<?amount> <query>"));

    derpiCommand
        .registerSubCommand("first", new OverloadCommand())
        .registerOverload("1+", new SimpleCommand(({ message, content }) => process(key, message, content, "first")))
        .setHelp(new HelpContent().setUsage("<?amount> <query>"));

    derpiCommand.registerSubCommandAlias("random", "*");
    cr.registerAlias("derpi", "db");
};
