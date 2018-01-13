const derpibooru = require("../keys/derpibooru.json");
const log = require("../modules/log");
const { promisify } = require("util");
const request = promisify(require("request"));
const Command = require("../modules/Command");

async function get(params) {
    const scope = params.scope || "search";
    delete params.scope;

    let string = [];
    for (let key in params) {
        string.push(key + "=" + params[key]);
    }
    string = string.join("&");

    const result = (await request({
        url: `https://derpibooru.org/${scope}.json?key=${derpibooru.key}&${string}`,
        timeout: 10000,
        json: true
    })).body;
    return result;
}

const command = new Command(async function onmessage(message) {
    // derpibooru
    if (/^\!db/i.test(message.content)) {
        const timestamp = Date.now();

        /**
         * @type {string}
         */
        let msg = message.content;
        while (msg.indexOf("  ") > -1) msg = msg.replace(/\ \ /g, " "); // remove double spaces
        msg = msg.substring(4, Math.max(4, msg.length));

        if (msg === "") {
            await message.channel.send(this.usage);
            log("No arguments given. Sent derpi help");
            return;
        }

        log("Used !db with:", msg);

        let i = 0;
        let current_char = msg.charAt(i);

        let amount = 1;
        try {
            const a = parseInt(current_char);
            if (typeof a === "number" && !Number.isNaN(a)) {
                amount = "";
                while (current_char !== " ") {
                    amount += current_char;
                    i++;
                    current_char = msg.charAt(i);
                }
                i++;
                current_char = msg.charAt(i);
                try {
                    const amountParse = parseInt(amount);
                    if (amountParse < 1 || amountParse > 5) {
                        await message.channel.send("\`amount\` cannot be smaller than 1 or greater than 5!\n\n" + this.usage);
                        log("Gracefully aborted attempt to request derpi image. Amount out of range");
                        return;
                    }
                    amount = amountParse;
                } catch (err) {
                    await message.channel.send("Invalid input\n\n" + this.usage);
                    log("Gracefully aborted attempt to request derpi image. Invalid amount input");
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
            amount = 1;
        }

        let order = "";
        while (i < msg.length && current_char !== " ") {
            order += current_char.toLowerCase();
            i++;
            current_char = msg.charAt(i);
        }
        i++;
        current_char = msg.charAt(i);

        if (!/first|latest|top|random/.test(order)) {
            await message.channel.send("\`order\` must be either \`first, latest, top\` or \`random\`!\n\n" + this.usage);
            log(`Gracefully aborted attempt to request derpi image. ${order} is not a valid type of order`);
            return;
        }

        if (i >= msg.length) {
            await message.channel.send("\`query\` **must** be given\n\n" + this.usage);
            log("Gracefully aborted attempt to request derpi image. No query given");
            return;
        }

        let query = "";
        while (i < msg.length && current_char !== "") {
            query += current_char;
            i++;
            current_char = msg.charAt(i);
        }
        query = query.replace(/\,\ /g, ",");
        query = query.replace(/\ /g, "+");

        let images = [];
        let ids = [];

        let result;
        switch (order) {
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
            images = images.map(image => "https:" + image.representations.large);
            break;
        }

        if (images.length === 0) {
            await message.channel.send("The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
            log(`No derpi images found for ${msg}`);
            return;
        }

        let output = "";
        for (let image of images) {
            output += "\n";
            output += image;
        }

        await message.channel.send(output);

        log("Found derpi images", ...ids, `[${Date.now() - timestamp}ms]`);
    }
}, {
    usage: `\`!db <?amount> <order:first|latest|top|random> <query>\`
\`amount\` - optional - number ranging from 1 to 5 for how many results to return
\`order\` - string of either \`first, latest, top\` or \`random\`
\`query\` - a query string. Uses Derpibooru's syntax (<https://derpibooru.org/search/syntax>)`    ,
    ignore: true
});

module.exports = command;
