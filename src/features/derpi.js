const derpibooruKey = require("../../keys/derpibooru.json");
const { splitArgs } = require("../modules/string_utils");
const fetch = require("node-fetch");

const BaseCommand = require("../class/BaseCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

async function get(params) {
    const scope = params.scope || "search";
    delete params.scope;

    let string = [];
    for (const key in params)
        string.push(key + "=" + params[key]);
    string = string.join("&");

    const result = await fetch(`https://derpibooru.org/${scope}.json?key=${derpibooruKey.key}&${string}`, {
        timeout: 10000
    });
    return await result.json();
}

async function process(message, msg, type) {
    if (msg === "") return;

    const args = splitArgs(msg, 2);

    let amount = 1;
    try {
        const numParse = parseInt(args[0]);
        if (typeof numParse === "number" && !Number.isNaN(numParse)) {
            if (numParse < 1 || numParse > 5) {
                await message.channel.send(await message.channel.translate("`amount` cannot be smaller than 1 or greater than 5!"));
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

    let query = args[1].replace(/,\s+/g, ",").replace(/\s+/g, "+").toLowerCase();

    if (query === "") {
        await message.channel.send(await message.channel.translate("`query` **must** be given"));
        return;
    }

    if (!message.channel.nsfw &&
        !/explicit|questionable|suggestive|grimdark|semi-grimdark|grotesque/gi.test(query)) {
        query += ",safe";
    }

    let images = [];
    let ids = [];

    let result;
    switch (type) {
        case "first":
            result = await get({
                q: query,
                sf: "id",
                sd: "asc"
            });
            for (let i = 0; i < Math.min(amount, result.search.length); i++) {
                const image = result.search[i];
                images.push("https:" + image.representations.large);
                ids.push(image.id);
            }
            break;
        case "latest":
            result = await get({
                q: query,
                sf: "id",
                sd: "desc"
            });
            for (let i = 0; i < Math.min(amount, result.search.length); i++) {
                const image = result.search[i];
                images.push("https:" + image.representations.large);
                ids.push(image.id);
            }
            break;
        case "top":
            result = await get({
                q: query,
                sf: "score",
                sd: "desc"
            });
            for (let i = 0; i < Math.min(amount, result.search.length); i++) {
                const image = result.search[i];
                images.push("https:" + image.representations.large);
                ids.push(image.id);
            }
            break;
        case "random":
            result = await get({
                q: query
            });
            for (let i = 0; i < Math.min(amount, result.total); i++) {
                images.push(get({
                    q: query,
                    random_image: "true"
                }).then(({ id }) => get({
                    scope: id
                })));
            }
            images = await Promise.all(images);
            ids = images.map(image => image.id);
            images = images.map(image => "https:" + image.representations.large + " *<https://derpibooru.org/" + image.id + ">*");
            break;
    }

    if (images.length === 0) {
        await message.channel.sendTranslated("The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
        return;
    }

    const output = images.join("\n");

    await message.channel.send(output);
}

module.exports = async function install(cr) {
    const derpiCommand = cr.register("derpi", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Search images on Derpibooru. This command ***does not*** return lewd images in a not nsfw channel! Unless you explicitly give the query the `explicit`, `questionable` or `suggestive` tag! Same for Grimdark and grotesque."))
        .setCategory(Category.IMAGE);

    /**
     * SUB COMMANDS
     */

    derpiCommand.registerSubCommand("random", new class extends BaseCommand {
        async call(message, msg) {
            await process(message, msg, "random");
        }
    }).setHelp(new HelpContent()
        .setUsage("<?amount> <query>")
        .addParameterOptional("amount", "number ranging from 1 to 5 for how many results to return")
        .addParameter("query", "a query string. Uses Derpibooru's syntax (<https://derpibooru.org/search/syntax>)"));

    derpiCommand.registerSubCommand("top", new class extends BaseCommand {
        async call(message, msg) {
            await process(message, msg, "top");
        }
    }).setHelp(new HelpContent()
        .setUsage("<?amount> <query>"));

    derpiCommand.registerSubCommand("latest", new class extends BaseCommand {
        async call(message, msg) {
            await process(message, msg, "latest");
        }
    }).setHelp(new HelpContent()
        .setUsage("<?amount> <query>"));

    derpiCommand.registerSubCommand("first", new class extends BaseCommand {
        async call(message, msg) {
            await process(message, msg, "first");
        }
    }).setHelp(new HelpContent()
        .setUsage("<?amount> <query>"));

    derpiCommand.registerSubCommandAlias("random", "*");
    cr.registerAlias("derpi", "db");
};