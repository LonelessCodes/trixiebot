const pixabayKey = require("../../keys/pixabay.json");
const fetch = require("node-fetch");
const log = require("../modules/log");
const Command = require("../class/Command");

Array.prototype.random = function randomItem() {
    return this[Math.floor(Math.random() * this.length)];
};

let cache = null;
async function get() {
    if (!cache) {
        cache = await fetch(`https://pixabay.com/api/?key=${pixabayKey.key}&q=cat&image_type=photo&order=popular&per_page=100`);
        cache = await cache.json();
        setTimeout(() => cache = null, 1000 * 3600 * 24); // cache for 24 hours
    }
    return cache;
}

async function random() {
    const result = (await get()).hits;

    const random = result[Math.floor(Math.random() * result.length)];

    const url = random.webformatURL;

    return url;
}

const command = new Command(async function onmessage(message) {
    if (/^!cat\b/i.test(message.content)) {
        await message.channel.send("meow :3 " + await random());
        log("Requested random cat :3 meow");
    }
}, {
    usage: "`!cat` returns cat image :3",
    ignore: true
});

module.exports = command;
