const log = require("./log");
const { promisify } = require("util");
const request = promisify(require("request"));
const p = require("../package.json");

async function get(params) {
    const scope = params.scope || "index";
    delete params.scope;

    let string = [];
    for (let key in params) {
        string.push(key + "=" + params[key]);
    }
    string = string.join("&");

    const result = (await request({
        url: `https://e621.net/post/${scope}.json?${string}`,
        json: true,
        timeout: 10000,
        headers: {
            "User-Agent": `TrixieBot/${p.version} (by Loneless on e621)`
        }
    })).body;
    return result;
}

const usage = `Usage: \`!e621 <?amount> <order:latest> <query>\`
\`amount\` - optional - number ranging from 1 to 5 for how many results to return
\`order\` - string of either \`latest\`
\`query\` - a query string. Uses E621's syntax (<https://e621.net/help/show/tags>)`;

async function onmessage(message) {
    if (message.author.bot) return;
    if (message.channel.type !== "text") return;
    
    // e621 help
    if (/^\!e621help/i.test(message.content)) {
        log("Requested Help");
        message.channel.send(usage);
        return;
    }
    // e621    
    else if (/^\!e621/i.test(message.content)) {
        const timestamp = Date.now();

        /**
         * @type {string}
         */
        let msg = message.content;
        while (msg.indexOf("  ") > -1) msg = msg.replace(/\ \ /g, " "); // remove double spaces
        msg = msg.substring(6, Math.max(6, msg.length));

        if (msg === "") {
            message.channel.send(usage);
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
                        message.channel.send("\`amount\` cannot be smaller than 1 or greater than 5!\n\n" + usage);
                        log("Amount out of range");
                        return;
                    }
                    num = numParse;
                } catch (err) {
                    message.channel.send("Invalid input\n\n" + usage);
                    log("Invalid input");
                    return;
                }
            } else throw new Error(); // go to catch
        } catch (err) {
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

        if (!/latest/.test(order)) {
            message.channel.send("\`order\` must be either \`latest\`!\n\n" + usage);
            return;
        }

        if (i >= msg.length) {
            message.channel.send("\`query\` **must** be given\n\n" + usage);
            return;
        }

        let query = "";
        while (i < msg.length && current_char !== "") {
            query += current_char;
            i++;
            current_char = msg.charAt(i);
        }
        query = query.replace(/\ /g, "+");

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
        }

        if (images.length === 0) {
            message.channel.send("The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
            log("No images found");
            return;
        }

        let output = "";
        for (let image of images) {
            output += "\n";
            output += image;
        }

        message.channel.send(output);

        log("Found images", ...ids, `[${Date.now() - timestamp}ms]`);
    }
}


function init(client) {
    client.on("message", message => onmessage(message).catch(err => {
        log(err);
        message.channel.send("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
    }));
}

module.exports = init;
