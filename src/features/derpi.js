const derpibooruKey = require("../../keys/derpibooru.json");
const log = require("../modules/log");
const fetch = require("node-fetch");
const Command = require("../class/Command");

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

class DerpiCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        // derpibooru
        if (!/^db\b/i.test(message.content)) return;

        const timestamp = Date.now();

        /**
         * @type {string}
         */
        let msg = message.content.substr(3);

        if (msg === "") {
            await message.channel.send(this.usage(message.prefix));
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
                        await message.channel.send("`amount` cannot be smaller than 1 or greater than 5!\n\n" + this.usage(message.prefix));
                        log("Gracefully aborted attempt to request derpi image. Amount out of range");
                        return;
                    }
                    amount = amountParse;
                } catch (err) {
                    await message.channel.send("Invalid input\n\n" + this.usage(message.prefix));
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
            await message.channel.send("`order` must be either `first`, `latest`, `top` or `random`!\n\n" + this.usage(message.prefix));
            log(`Gracefully aborted attempt to request derpi image. ${order} is not a valid type of order`);
            return;
        }

        if (i >= msg.length) {
            await message.channel.send("`query` **must** be given\n\n" + this.usage(message.prefix));
            log("Gracefully aborted attempt to request derpi image. No query given");
            return;
        }

        let query = "";
        while (i < msg.length && current_char !== "") {
            query += current_char;
            i++;
            current_char = msg.charAt(i);
        }
        query = query.replace(/,\s/g, ",");
        query = query.replace(/\s/g, "+");

        if (!message.channel.nsfw &&
            query.indexOf("explicit") === -1 &&
            query.indexOf("questionable") === -1 &&
            query.indexOf("grimdark") === -1 &&
            query.indexOf("semi-grimdark") === -1 &&
            query.indexOf("grotesque") === -1) {
            query += ",(safe OR suggestive)";
        }

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
        for (const image of images) {
            output += "\n";
            output += image;
        }

        await message.channel.send(output);

        log("Found derpi images", ...ids, `[${Date.now() - timestamp}ms]`);
    }
    usage(prefix) {
        return `\`${prefix}db <?amount> <order:first|latest|top|random> <query>\`
\`amount\` - optional - number ranging from 1 to 5 for how many results to return
\`order\` - string of either \`first, latest, top\` or \`random\`
\`query\` - a query string. Uses Derpibooru's syntax (<https://derpibooru.org/search/syntax>)`;
    }
}

module.exports = DerpiCommand;
