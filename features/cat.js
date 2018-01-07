const pixabay = require("../keys/pixabay.json");
const { promisify } = require("util");
const request = promisify(require("request"));
const log = require("../modules/log");
const Command = require("../modules/Command");

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

let cache = null;
async function get() {
    if (!cache) {
        cache = (await request({
            url: `https://pixabay.com/api/?key=${pixabay.key}&q=cat&image_type=photo&order=popular&per_page=100`,
            json: true
        })).body;
        setTimeout(() => cache = null, 1000 * 3600 * 24); // cache for 24 hours
    }
    return cache;
}

async function random() {
    const result = (await get()).hits;

    const random = result[Math.floor(Math.random() * result.length)];

    const url = random.webformatURL;
    // const source = random.pageURL;

    return url;
}

const usage = "Usage: `!cat` returns cat image :3";

const command = new Command(async function onmessage(message) {
    if (/^\!cat/i.test(message.content)) {
        await message.channel.send("meow :3 " + await random());
        log("Random cat :3 meow");
    }
});

module.exports = command;
