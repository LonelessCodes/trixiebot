const { splitArgs } = require("../modules/string_utils");
const secureRandom = require("random-number-csprng");
const fetch = require("node-fetch");
const packageFile = require("../../package.json");

const BaseCommand = require("../class/BaseCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

Array.prototype.random = async function randomItem() {
    return this[await secureRandom(0, this.length - 1)];
};

async function get(params) {
    const scope = params.scope || "index";
    delete params.scope;

    let string = [];
    for (const key in params)
        string.push(key + "=" + params[key]);
    string = string.join("&");

    const result = await fetch(`https://e621.net/post/${scope}.json?${string}`, {
        timeout: 10000,
        headers: {
            "User-Agent": `TrixieBot/${packageFile.version} (by Loneless on e621)`
        }
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

    let query = args[1].replace(/\s+/g, "+").toLowerCase();

    if (query === "") {
        await message.channel.send(await message.channel.translate("`query` **must** be given"));
        return;
    }

    if (!message.channel.nsfw && !/rating:(e|q|explicit|questionable)/g.test(query)) {
        query += " rating:s";
    }

    const images = [];
    const ids = [];

    let result;
    switch (type) {
        case "random":
            result = await get({
                tags: query,
                sf: "id",
                sd: "desc",
                limit: 300
            });
            for (let i = 0; i < Math.min(amount, result.length); i++) {
                const image = await result.random();
                images.push(image.file_url + " *<https://e621.net/post/show/" + image.id + ">*");
                ids.push(image.id);
            }
            break;
        case "latest":
            result = await get({
                tags: query,
                sf: "id",
                sd: "desc",
                limit: amount
            });
            for (let i = 0; i < Math.min(amount, result.length); i++) {
                const image = result[i];
                images.push(image.file_url + " *<https://e621.net/post/show/" + image.id + ">*");
                ids.push(image.id);
            }
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
    const e621Command = cr.register("e621", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Search images on e621"))
        .setCategory(Category.IMAGE);
    
    /**
     * SUB COMMANDS
     */

    e621Command.registerSubCommand("random", new class extends BaseCommand {
        async call(message, msg) {
            await process(message, msg, "random");
        }
    }).setHelp(new HelpContent()
        .setUsage("<?amount> <query>")
        .addParameterOptional("amount", "number ranging from 1 to 5 for how many results to return")
        .addParameter("query", "a query string. Uses E621's syntax (<https://e621.net/help/show/tags>)"));

    e621Command.registerSubCommand("latest", new class extends BaseCommand {
        async call(message, msg) {
            await process(message, msg, "latest");
        }
    }).setHelp(new HelpContent()
        .setUsage("<?amount> <query>"));

    e621Command.registerSubCommandAlias("random", "*");
};