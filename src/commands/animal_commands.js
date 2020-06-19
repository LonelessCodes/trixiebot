/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const fetch = require("node-fetch");
const catFace = require("cat-ascii-faces");
const dogFace = require("dog-ascii-faces");

const { promisify } = require("util");
const { timeout } = require("../util/promises");
const { lastItem, randomItem } = require("../util/array");
const log = require("../log").default;
const twitter = require("../modules/twitter");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const CommandScope = require("../util/commands/CommandScope").default;

const Translation = require("../modules/i18n/Translation").default;
const TranslationMerge = require("../modules/i18n/TranslationMerge").default;

/**
 * @param {fetch.RequestInfo} url
 * @param {fetch.RequestInit} [init]
 * @returns {Promise<any>}
 */
function reconnectFetch(url, init) {
    const reconnect = async (reconnectTries = 0) => {
        const time_wait = reconnectTries * reconnectTries * 1000;
        if (time_wait > 0) await timeout(time_wait);
        try {
            const response = await fetch.default(url, init);
            return await response.json();
        } catch (err) {
            reconnectTries++;
            if (reconnectTries > 3) throw err;
            return await reconnect(reconnectTries);
        }
    };

    return reconnect();
}

async function randomCat() {
    const result = await reconnectFetch("http://aws.random.cat/meow");
    return result.file;
}

async function randomDog() {
    const result = await reconnectFetch("https://random.dog/woof.json");
    return result.url;
}

async function randomFox() {
    const result = await reconnectFetch("https://randomfox.ca/floof");
    return result.image;
}

async function randomShibe() {
    const result = await reconnectFetch("http://shibe.online/api/shibes?count=1&urls=true&httpsUrls=true");
    return result[0];
}

async function randomBird() {
    const result = await reconnectFetch("http://shibe.online/api/birds?count=1&urls=true&httpsUrls=true");
    return result[0];
}

module.exports = function install(cr) {
    cr.registerCommand(
        "cat",
        new SimpleCommand(async () => new TranslationMerge(new Translation("animal.cat", "meow"), catFace(), await randomCat()))
    )
        .setHelp(new HelpContent().setUsage("", "Random cat image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("cat", "kitty");

    cr.registerCommand(
        "dog",
        new SimpleCommand(async () => new TranslationMerge(new Translation("animal.dog", "woof"), dogFace(), await randomDog()))
    )
        .setHelp(new HelpContent().setUsage("", "Random dog image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("dog", "doggo", "puppy", "bork", "pup");

    cr.registerCommand(
        "fox",
        new SimpleCommand(async () => new TranslationMerge(new Translation("animal.fox", "yip"), "🦊", await randomFox()))
    )
        .setHelp(new HelpContent().setUsage("", "Random fox image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("fox", "foxie", "foxi", "weff");

    cr.registerCommand(
        "shibe",
        new SimpleCommand(
            async () => new TranslationMerge(new Translation("animal.shibe", "weff"), dogFace(), await randomShibe())
        )
    )
        .setHelp(new HelpContent().setUsage("", "Random SHIBE image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("shibe", "shiba");

    cr.registerCommand(
        "bird",
        new SimpleCommand(async () => new TranslationMerge(new Translation("animal.bird", "peep"), "ovo", await randomBird()))
    )
        .setHelp(new HelpContent().setUsage("", "Random Birb image ovo"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("bird", "birb", "borb", "birbo");

    // POSSUMS~~~<3
    if (!twitter) return log.namespace("config", "Found no API credentials for Twitter - Disabled possum command");

    const get = promisify(twitter.get).bind(twitter);

    /** @type {Promise<Set<string>>} */
    const possums = new Promise(async resolve => {
        const possums = new Set();

        let tweets_available = true;
        let smallest_id = null;
        let newest_id = null;
        while (tweets_available) {
            const data = await get("statuses/user_timeline", {
                screen_name: "PossumEveryHour",
                count: 200,
                include_rts: false,
                exclude_replies: true,
                trim_user: true,
                max_id: smallest_id || undefined,
            });
            if (!newest_id) newest_id = data[0].id_str;
            if (data.length <= 1) tweets_available = false;
            else {
                smallest_id = lastItem(data).id_str;
                data.filter(tweet => tweet.entities.media && tweet.entities.media[0]).forEach(tweet =>
                    possums.add(tweet.entities.media[0].media_url_https)
                );
            }
            resolve(possums); // indicates that the set now has a few values, and then just continue fetching more
            await timeout((60000 * 15) / 900); // care about rate limits
        }

        log.namespace("possum cmd")("Possums loaded:", possums.size);
    }).catch(log);

    async function randomPossum() {
        return await randomItem([...(await possums)]);
    }

    cr.registerCommand(
        "possum",
        new SimpleCommand(async () => new TranslationMerge("<:possum:671445107781795851>", await randomPossum()))
    )
        .setHelp(
            new HelpContent().setUsage("", "Gets random Opossum image~. Gets images from <https://twitter.com/PossumEveryHour>")
        )
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL, true);

    cr.registerAlias("possum", "opossum", "poss");
};
