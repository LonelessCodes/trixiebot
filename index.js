const discord = require("./keys/discord.json");
// const derpibooru = require("./keys/derpibooru.json");
const Discord = require("discord.js");
const { promisify } = require("util");
const request = promisify(require("request"));
const colors = require("colors");

async function get(params) {
    const scope = params.scope || "search";
    delete params.scope;

    let string = [];
    for (let key in params) {
        string.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
    }
    string = string.join("&");

    const result = (await request({
        url: `https://derpibooru.org/${scope}.json?${string}`,
        json: true
    })).body;
    return result;
}

/**
 * Fits the length of the input string to the specified length.
 * E.g. Useful to fit a 6bit string (each char either 1 or 0) to an 8bit string
 */
function toString(input, length) {
    input = input.toString ? input.toString() : input;
    let string = "";
    for (let i = 0; i < length - input.length; i++) string += "0";
    string += input;
    return string;
}

function getTimeString(blank) {
    const d = new Date();

    const time =
        toString(d.getMonth() + 1, 2) + "." +
        toString(d.getDate(), 2) + " " +
        toString(d.getHours(), 2) + ":" +
        toString(d.getMinutes(), 2) + ":" +
        toString(d.getSeconds(), 2) + ":" +
        toString(d.getMilliseconds(), 3);

    if (blank) return time + "> ";
    else return colors.cyan.bold(time) + "> ";
}

function log(...messages) {
    console.log(getTimeString(), ...messages);
}

const client = new Discord.Client();

client.on("ready", () => {
    console.log("I am ready");

    client.user.setGame("!dbhelp for help");
});

const usage = `Usage: \`!db <?amount> <order:first|latest|top|random> <query>\`
\`amount\` - optional - number ranging from 1 to 5 for how many results to return
\`order\` - string of either \`first, latest, top\` or \`random\`
\`query\` - a query string. Uses Derpibooru's syntax (https://derpibooru.org/search/syntax)`;

async function onmessage(message) {
    if (message.content.startsWith("!ping")) {
        message.channel.send("pong!");
        return;
    }
    if (message.content.startsWith("!dbhelp")) {
        log("Requested Help");
        message.channel.send(usage);
        return;
    }
    if (message.content.startsWith("!db")) {
        const timestamp = Date.now();

        /**
         * @type {string}
         */
        let msg = message.content.toLowerCase();
        while (msg.indexOf("  ") > -1) msg = msg.replace(/\ \ /g, " "); // remove double spaces
        msg = msg.substring(4, Math.max(4, msg.length));

        if (msg === "") {
            message.channel.send(usage);
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
                        message.channel.send("\`amount\` cannot be smaller than 1 or greater than 9!\n\n" + usage);
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
        while (current_char !== " ") {
            order += current_char;
            i++;
            current_char = msg.charAt(i);
        }
        i++;
        current_char = msg.charAt(i);

        if (!/first|latest|top|random/.test(order)) {
            message.channel.send("\`order\` must be either \`first, latest, top\` or \`random\`!\n\n" + usage);
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
            for (let i = 0; i < Math.min(num, result.search.length); i++) {
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
            for (let i = 0; i < Math.min(num, result.search.length); i++) {
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
            for (let i = 0; i < Math.min(num, result.search.length); i++) {
                const image = result.search[i];
                images.push("https:" + image.representations.large);
                ids.push(image.id);
            }
            break;
        case "random":
            result = await get({
                q: query
            });
            const total = result.total;
            for (let i = 0; i < Math.min(num, total); i++) {
                images.push(get({
                    q: query,
                    random_image: "true"
                }).then(({id}) => get({
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
}

client.on("message", message => onmessage(message).catch(console.error));

client.login(discord.token);
