const log = require("../modules/log");
const fetch = require("node-fetch");
const packageFile = require("../../package.json");
const Command = require("../class/Command");

Array.prototype.random = function randomItem() {
    return this[Math.floor(Math.random() * this.length)];
};

async function get(params) {
    const scope = params.scope || "index";
    delete params.scope;

    let string = [];
    for (let key in params) {
        string.push(key + "=" + params[key]);
    }
    string = string.join("&");

    const result = await fetch(`https://e621.net/post/${scope}.json?${string}`, {
        timeout: 10000,
        headers: {
            "User-Agent": `TrixieBot/${packageFile.version} (by Loneless on e621)`
        }
    });
    return await result.json();
}

const command = new Command(async function onmessage(message) {
    // e621
    if (/^!e621\b/i.test(message.content)) {
        const timestamp = Date.now();

        /**
         * @type {string}
         */
        let msg = message.content.substr(6);

        if (msg === "") {
            await message.channel.send(this.usage);
            log("Sent e621 help");
            return;
        }

        log("Used !e621 with:", msg);

        let i = 0;
        let current_char = msg.charAt(i);

        let num = 1;
        try {
            const a = parseInt(current_char);
            if (typeof a === "number" && !Number.isNaN(a)) {
                num = "";
                while (current_char !== " ") {
                    num += current_char;
                    i++;
                    current_char = msg.charAt(i);
                }
                i++;
                current_char = msg.charAt(i);
                try {
                    const numParse = parseInt(num);
                    if (numParse < 1 || numParse > 5) {
                        await message.channel.send("`amount` cannot be smaller than 1 or greater than 5!\n\n" + this.usage);
                        log("Gracefully aborted attempt to request e621 image. Amount out of range");
                        return;
                    }
                    num = numParse;
                } catch (err) {
                    message.channel.send("Invalid input\n\n" + this.usage);
                    log("Gracefully aborted attempt to request e621 image. Invalid amount input");
                    return;
                }
            } else throw new Error(); // go to catch
        } catch (err) {
            if (err.message !== "") {
                log(err);
                return;
            }
            i = 0;
            current_char = msg.charAt(i);
            num = 1;
        }

        let order = "";
        while (i < msg.length && current_char !== " ") {
            order += current_char.toLowerCase();
            i++;
            current_char = msg.charAt(i);
        }
        i++;
        current_char = msg.charAt(i);

        if (!/latest|random/.test(order)) {
            await message.channel.send("`order` must be either `latest` or `random`!\n\n" + this.usage);
            log(`Gracefully aborted attempt to request e621 image. ${order} is not a valid type of order`);
            return;
        }

        if (i >= msg.length) {
            await message.channel.send("`query` **must** be given\n\n" + this.usage);
            log("Gracefully aborted attempt to request e621 image. No query given");
            return;
        }

        let query = "";
        while (i < msg.length && current_char !== "") {
            query += current_char;
            i++;
            current_char = msg.charAt(i);
        }
        query = query.replace(/\s/g, "+");

        if (!message.channel.nsfw &&
            query.indexOf("rating:e") === -1 &&
            query.indexOf("rating:q") === -1 &&
            query.indexOf("rating:explicit") === -1 &&
            query.indexOf("rating:questionable") === -1) {
            query += " rating:s";
        }

        let images = [];
        let ids = [];

        let result;
        switch (order) {
        case "latest":
            result = await get({
                tags: query,
                sf: "id",
                sd: "desc",
                limit: num
            });
            for (let i = 0; i < Math.min(num, result.length); i++) {
                const image = result[i];
                images.push(image.file_url);
                ids.push(image.id);
            }
            break;
        case "random":
            result = await get({
                tags: query,
                sf: "id",
                sd: "desc",
                limit: 320
            });
            for (let i = 0; i < Math.min(num, result.length); i++) {
                const image = result.random();
                images.push(image.file_url);
                ids.push(image.id);
            }
            break;
        }

        if (images.length === 0) {
            await message.channel.send("The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
            log(`No e621 images found for ${msg}`);
            return;
        }

        let output = "";
        for (let image of images) {
            output += "\n";
            output += image;
        }

        await message.channel.send(output);

        log("Found e621 images", ...ids, `[${Date.now() - timestamp}ms]`);
    }
}, {
    usage: `\`!e621 <?amount> <order:latest|random> <query>\`
\`amount\` - optional - number ranging from 1 to 5 for how many results to return
\`order\` - string of either \`latest\` or \`random\`
\`query\` - a query string. Uses E621's syntax (<https://e621.net/help/show/tags>)`,
    ignore: true
});

module.exports = command;
