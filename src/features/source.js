const cheerio  = require("cheerio");
const request = require("request-promise-native");
const fetch = require("node-fetch");
const INFO = require("../info");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

async function getE621(url) {
    const formData = {
        "file": "",
        "url": url,
        "service[]": "0",
        "MAX_FILE_SIZE": "8388608",
        "forcegray": "",
        "mask-explicit": "",
    };

    // const r = await fetch(url);

    // const formData = {
    //     "service[]": "0",
    //     "MAX_FILE_SIZE": "8388608",
    //     "url": url,
    //     "forcegray": "on",
    //     "mask-explicit": "on"
    // };

    const body = await request.post({ url: "http://iqdb.harry.lu/", formData });
    const $ = cheerio.load(body);

    const elem = $("#pages table tbody");
    const href = elem.find("td.image a").attr("href");
    if (!href) return;

    const similarityText = elem.find("tr td").last().text();
    if (!similarityText) return;
    
    // if similarity too small
    const similarity = parseInt(similarityText); // get string containing similarity
    if (similarity < 80) return;

    const id = href.replace("https://e621.net/post/show/", ""); // parse id
    // send request to the e621 API
    const response = await request.get({
        url: "https://e621.net/post/show.json?id=" + id,
        headers: {
            "User-Agent": `TrixieBot/${INFO.VERSION} (by Loneless on e621)`
        }
    });
    // parse JSON
    const json = JSON.parse(response);
    // return if no artist given
    if (!json.sources || !json.sources[0]) return;

    return `<${json.sources.find(v => /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g.test(v))}> (<${href}>)`;
}

async function getDerpi(url) {
    const first = await new Promise(res => {
        request.get({
            url: "https://derpibooru.org/search/reverse"
        }, (err, response, body) => {
            res({ response, body });
        });
    });

    const uhm = cheerio.load(first.body);

    const authenticity_token = uhm("form").serializeArray().find(({ name }) => name === "authenticity_token");

    const formData = {
        "utf8": "✓",
        "authenticity_token": authenticity_token ? authenticity_token.value || "" : "",
        "image": "",
        "scraper_url": url,
        "fuzziness": "0.25"
    };

    const body = await request.post({
        url: "https://derpibooru.org/search/reverse",
        formData,
        headers: {
            Cookie: first.response.headers["set-cookie"]
        }
    });
    const $ = cheerio.load(body);

    const elem = $("#content table tbody");
    let href = elem.find("tr:nth-child(2) h3 a").attr("href");
    if (!href) return;
    href = "https://derpibooru.org" + href;

    const source = elem.find("tr:nth-child(2) span.source_url a").attr("href");
    if (!source) return;

    return `<${source}> (<${href}>)`;
}

module.exports = function install(cr) {
    cr.register("source", new class extends BaseCommand {
        async call(message) {
            const urls = [];
            const messages = (await message.channel.fetchMessages({ limit: 15 })).array().sort((a, b) => b.createdAt - a.createdAt);
            for (const m of messages) {
                const l = urls.length;
                const match = m.content.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g);
                urls.push(...(match || []));
                for (const a of m.attachments.array()) {
                    urls.push(a.url);
                }
                if (l !== urls.length) break;
            }

            if (urls.length === 0) return;

            const sources = [];
            for (const url of urls) {
                let source;
                source = await getE621(url);
                console.log(source);
                if (!source) source = await getDerpi(url);
                if (!source) break;
                sources.push(source);
            }
            if (sources.length === 0) {
                await message.react("❌");
                return;
            }

            await message.react("✅");
            await message.channel.send(sources.join("\n"));
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Finds the source of an image on e621's and Derpibooru's database"))
        .setCategory(Category.IMAGE);
};