const { splitArgs } = require("../modules/util/string");
const { randomItem } = require("../modules/util/array");
const fetch = require("node-fetch");
const INFO = require("../info");

const SimpleCommand = require("../class/SimpleCommand");
const OverloadCommand = require("../class/OverloadCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

const filter_tags = ["shota", "cub", "self_harm", "suicide", "animal_abuse", "gore", "child_abuse"];

function findAndRemove(arr, elem) {
    const i = arr.indexOf(elem);
    if (i > -1) arr.splice(i, 1);
}

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
            "User-Agent": `TrixieBot/${INFO.VERSION} (by Loneless on e621)`
        }
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

    const tags = args[1].toLowerCase().trim().split(/,?\s+/g);

    if (tags.length === 0) {
        await message.channel.send(await message.channel.translate("`query` **must** be given"));
        return;
    }

    // filter nsfw tags in sfw channel
    if (!message.channel.nsfw) {
        for (const tag of ["rating:e", "rating:q", "rating:explicit", "rating:questionable"])
            findAndRemove(tags, tag);
        tags.push("rating:s");
    }

    // filter tags that are not allowed by the discord community guidelines
    let warning = "";
    if (filter_tags.some(tag => tags.includes(tag))) {
        for (const tag of filter_tags)
            findAndRemove(tags, tag);
        warning = "The content you were trying to look up violates Discord's Community Guidelines :c I had to filter it, cause I wanna be a good filly\n";
    }

    if (type === "top") tags.push("order:score");

    // join to a query string
    const query = tags.join(" ");

    const results = [];
    let whileBreak = 100;
    let result;
    switch (type) {
        case "random":
            result = await fetchImages({
                tags: encodeURIComponent(query),
                sf: "id",
                sd: "desc",
                limit: 300
            });
            for (let i = 0; i < Math.min(amount, result.length); i++) {
                if (whileBreak <= 0) break;
                whileBreak--;

                const image = await randomItem(result);
                const tags = image.tags.split(/\s+/g);
                if (filter_tags.some(tag => tags.includes(tag))) {
                    i--;
                    continue;
                }
                results.push({
                    image_url: image.file_url,
                    id: image.id,
                    artist: image.artist
                });
            }
            break;
        case "latest":
            result = await fetchImages({
                tags: encodeURIComponent(query),
                sf: "id",
                sd: "desc",
                limit: amount
            });
            for (let i = 0; i < Math.min(amount, result.length); i++) {
                if (whileBreak <= 0) break;
                whileBreak--;

                const image = result[i];
                if (!image) break;

                const tags = image.tags.split(/\s+/g);
                if (filter_tags.some(tag => tags.includes(tag))) {
                    i--;
                    continue;
                }
                results.push({
                    image_url: image.file_url,
                    id: image.id,
                    artist: image.artist
                });
            }
            break;
        case "popular":
            result = await fetchImages({
                scope: "popular_by_" + popular_order,
                tags: encodeURIComponent(query),
                limit: amount
            });
            for (let i = 0; i < Math.min(amount, result.length); i++) {
                if (whileBreak <= 0) break;
                whileBreak--;

                const image = result[i];
                if (!image) break;

                const tags = image.tags.split(/\s+/g);
                if (filter_tags.some(tag => tags.includes(tag))) {
                    i--;
                    continue;
                }
                results.push({
                    image_url: image.file_url,
                    id: image.id,
                    artist: image.artist
                });
            }
            break;
        case "top":
            result = await fetchImages({
                tags: encodeURIComponent(query),
                limit: amount
            });
            for (let i = 0; i < Math.min(amount, result.length); i++) {
                if (whileBreak <= 0) break;
                whileBreak--;

                const image = result[i];
                if (!image) break;

                const tags = image.tags.split(/\s+/g);
                if (filter_tags.some(tag => tags.includes(tag))) {
                    i--;
                    continue;
                }
                results.push({
                    image_url: image.file_url,
                    id: image.id,
                    artist: image.artist
                });
            }
            break;
    }
    
    if (results.length === 0) {
        if (warning === "") await message.channel.sendTranslated("The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
        else await message.channel.sendTranslated(warning);
        return;
    }

    const output = warning + results.map(result => {
        let str = "";
        if (result.artist) str += `**${result.artist.join(", ")}** `;
        str += `*<https://e621.net/post/show/${result.id}>* `;
        str += result.image_url;
        return str;
    }).join("\n");

    await message.channel.send(output);
}

module.exports = async function install(cr) {
    const e621Command = cr.registerCommand("e621", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Search images on e621. If used in non-nsfw channels, it will only show safe posts. The bot will automatically filter posts containing content violating Discord's Community Guidelines."))
        .setCategory(Category.IMAGE);
    
    /**
     * SUB COMMANDS
     */

    e621Command.registerSubCommand("random", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand((message, msg) => process(message, msg, "random")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>")
            .addParameterOptional("amount", "number ranging from 1 to 5 for how many results to return")
            .addParameter("query", "a query string. Uses E621's syntax (<https://e621.net/help/show/tags>)"));

    e621Command.registerSubCommand("latest", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand((message, msg) => process(message, msg, "latest")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>"));
    
    e621Command.registerSubCommand("top", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand((message, msg) => process(message, msg, "top")))
        .setHelp(new HelpContent()
            .setUsage("<?amount> <query>"));
    
    e621Command.registerSubCommand("popular", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async (message, msg) => {
            let popular_order = "week";

            if (/^day|week|month/i.test(msg)) {
                const args = splitArgs(msg, 2);
                popular_order = args[0].toLowerCase();
                msg = args[1];
            }

            let amount = 1;
            try {
                const numParse = parseInt(msg);
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
            }

            const result = await fetchImages({
                scope: "popular_by_" + popular_order,
                limit: 100
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
                    artist: image.artist
                });
            }

            if (results.length === 0) {
                await message.channel.sendTranslated("The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
                return;
            }

            const output = results.map(result => {
                let str = "";
                if (result.artist) str += `**${result.artist.join(", ")}** `;
                str += `*<https://e621.net/post/show/${result.id}>* `;
                str += result.image_url;
                return str;
            }).join("\n");

            await message.channel.send(output);
        })).setHelp(new HelpContent()
            .setDescription("Returns the current most popular images by day, week or month.")
            .setUsage("<?timerange> <?amount>")
            .addParameterOptional("timerange", "Popular by 'day', 'week' or 'month'. Default: 'week'"));

    e621Command.registerSubCommandAlias("random", "*");
};