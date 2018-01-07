const Twit = require("twit");
const { promisify } = require("util");
const { timeout } = require("./util");
const log = require("./log");

Array.prototype.last = function () {
    return this[this.length - 1];
};
Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

const twitter = new Twit(require("../keys/twitter.json"));
twitter.get = promisify(twitter.get);

const facts = new Set();

const firstSetLoaded = new Promise(async function loadTweets(resolve) {
    let tweets_available = true;
    let smallest_id = null;
    let newest_id = null;
    while (tweets_available) {
        const data = await twitter.get("statuses/user_timeline", {
            screen_name: "UberFacts",
            count: 200,
            include_rts: false,
            exclude_replies: true,
            trim_user: true,
            max_id: smallest_id || void 0
        });
        if (!newest_id) newest_id = data[0].id_str;
        if (data.length <= 1) tweets_available = false;
        else {
            smallest_id = data.last().id_str;
            data.filter(tweet => !tweet.entities.urls[0]).map(tweet => facts.add(tweet.text));
        }
        resolve(facts); // indicates that the set now has a few values, and then just continue fetching more
        await timeout(60000 * 15 / 900); // care about rate limits
    }

    console.log("FINAL " + facts.size);

    async function loadMoreTweets() {
        const data = await twitter.get("statuses/user_timeline", {
            screen_name: "UberFacts",
            count: 200,
            include_rts: false,
            exclude_replies: true,
            trim_user: true,
            since_id: newest_id || void 0
        });
        return data;
    }
    setInterval(async function () {
        const data = await loadMoreTweets();
        if (data.length !== 0) {
            newest_id = data[0].id_str;
            data.filter(tweet => !tweet.entities.urls[0]).map(tweet => facts.add(tweet.text));
        }
        console.log(data.length);
    }, 3600000);
}).catch(console.error);

async function getFact() {
    const facts = await firstSetLoaded;
    return [...facts].random();
}

const usage = "Usage: `!fact` gets random UberFacts fact";

async function onmessage(message) {
    if (message.author.bot) return;
    if (message.channel.type !== "text") return;

    if (/^\!fact/i.test(message.content)) {
        const fact = await getFact();
        await message.channel.send(fact);
        log("Fact requested");
    }
}

async function init(client) {
    client.on("message", message => onmessage(message).catch(err => {
        log(err);
        message.channel.send("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
    }));
}

module.exports = init;
