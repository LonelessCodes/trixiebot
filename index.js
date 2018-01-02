const discord = require("./keys/discord.json");
const derpibooru = require("./keys/derpibooru.json");
const log = require("./log.js");
const Discord = require("discord.js");
const { promisify } = require("util");
const request = promisify(require("request"));
const p = require("./package.json");

async function getDerpi(params) {
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

async function getE621(params) {
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

const client = new Discord.Client();

client.on("ready", () => {
    log("I am ready");

    client.user.setGame("!dbhelp for help");
});

const usageDerpi = `Usage: \`!db <?amount> <order:first|latest|top|random> <query>\`
\`amount\` - optional - number ranging from 1 to 5 for how many results to return
\`order\` - string of either \`first, latest, top\` or \`random\`
\`query\` - a query string. Uses Derpibooru's syntax (<https://derpibooru.org/search/syntax>)`;

const usageE621 = `Usage: \`!e621 <?amount> <order:latest> <query>\`
\`amount\` - optional - number ranging from 1 to 5 for how many results to return
\`order\` - string of either \`latest\`
\`query\` - a query string. Uses E621's syntax (<https://e621.net/help/show/tags>)`;

async function onmessage(message) {
    // ping pong
    if (message.content.startsWith("!ping")) {
        message.channel.send("pong! Wee hehe");
        return;
    }
    // db help
    else if (message.content.startsWith("!dbhelp")) {
        log("Requested Help");
        message.channel.send(usageDerpi);
        return;
    }
    // derpibooru    
    else if (message.content.startsWith("!db")) {
        const timestamp = Date.now();

        /**
         * @type {string}
         */
        let msg = message.content;
        while (msg.indexOf("  ") > -1) msg = msg.replace(/\ \ /g, " "); // remove double spaces
        msg = msg.substring(4, Math.max(4, msg.length));

        if (msg === "") {
            message.channel.send(usageDerpi);
            return;
        }

        log("Used !db with:", msg);

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
                        message.channel.send("\`amount\` cannot be smaller than 1 or greater than 5!\n\n" + usageDerpi);
                        log("Amount out of range");
                        return;
                    }
                    num = numParse;
                } catch (err) {
                    message.channel.send("Invalid input\n\n" + usageDerpi);
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

        if (!/first|latest|top|random/.test(order)) {
            message.channel.send("\`order\` must be either \`first, latest, top\` or \`random\`!\n\n" + usageDerpi);
            return;
        }

        if (i >= msg.length) {
            message.channel.send("\`query\` **must** be given\n\n" + usageDerpi);
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
            result = await getDerpi({
                q: query,
                sf: "id",
                sd: "asc"
            });
            for (let i = 0; i < Math.min(num, result.search.length); i++) {
                const image = result.search[i];
                images.push("https:" + image.representations.large);
                ids.push(image.id);
            }
            break;
        case "latest":
            result = await getDerpi({
                q: query,
                sf: "id",
                sd: "desc"
            });
            for (let i = 0; i < Math.min(num, result.search.length); i++) {
                const image = result.search[i];
                images.push("https:" + image.representations.large);
                ids.push(image.id);
            }
            break;
        case "top":
            result = await getDerpi({
                q: query,
                sf: "score",
                sd: "desc"
            });
            for (let i = 0; i < Math.min(num, result.search.length); i++) {
                const image = result.search[i];
                images.push("https:" + image.representations.large);
                ids.push(image.id);
            }
            break;
        case "random":
            result = await getDerpi({
                q: query
            });
            const total = result.total;
            for (let i = 0; i < Math.min(num, total); i++) {
                images.push(getDerpi({
                    q: query,
                    random_image: "true"
                }).then(({ id }) => getDerpi({
                    scope: id
                })));
            }
            images = await Promise.all(images);
            ids = images.map(image => image.id);
            images = images.map(image => "https:" + image.representations.large);
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
    // e621 help
    else if (message.content.startsWith("!e621help")) {
        log("Requested Help");
        message.channel.send(usageDerpi);
        return;
    }
    // e621    
    else if (message.content.startsWith("!e621")) {
        const timestamp = Date.now();

        /**
         * @type {string}
         */
        let msg = message.content;
        while (msg.indexOf("  ") > -1) msg = msg.replace(/\ \ /g, " "); // remove double spaces
        msg = msg.substring(6, Math.max(6, msg.length));

        if (msg === "") {
            message.channel.send(usageE621);
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
                        message.channel.send("\`amount\` cannot be smaller than 1 or greater than 5!\n\n" + usageE621);
                        log("Amount out of range");
                        return;
                    }
                    num = numParse;
                } catch (err) {
                    message.channel.send("Invalid input\n\n" + usageE621);
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
            message.channel.send("\`order\` must be either \`latest\`!\n\n" + usageE621);
            return;
        }

        if (i >= msg.length) {
            message.channel.send("\`query\` **must** be given\n\n" + usageE621);
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
            result = await getE621({
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

client.on("message", message => onmessage(message).catch(err => {
    log(err);
    message.channel.send("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
}));

client.login(discord.token);
