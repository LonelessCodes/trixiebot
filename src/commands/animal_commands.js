/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
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

const { timeout } = require("../util/promises");
const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Translation = require("../modules/i18n/Translation");
const TranslationMerge = require("../modules/i18n/TranslationMerge");

/**
 * @param {fetch.RequestInfo} url
 * @param {fetch.RequestInit} [init]
 * @returns {Promise<fetch.Response>}
 */
function reconnectFetch(url, init) {
    const reconnect = async (reconnectTries = 0) => {
        const time_wait = reconnectTries * reconnectTries * 1000;
        if (time_wait > 0) await timeout(time_wait);
        try {
            const response = await fetch(url, init);
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
    cr.registerCommand("cat", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.cat", "meow"), catFace(), await randomCat())
    ))
        .setHelp(new HelpContent().setUsage("", "Random cat image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("cat", "kitty");

    cr.registerCommand("dog", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.dog", "woof"), dogFace(), await randomDog())
    ))
        .setHelp(new HelpContent().setUsage("", "Random dog image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("dog", "doggo");
    cr.registerAlias("dog", "puppy");
    cr.registerAlias("dog", "bork");
    cr.registerAlias("dog", "pup");

    cr.registerCommand("fox", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.fox", "yip"), "🦊", await randomFox())
    ))
        .setHelp(new HelpContent().setUsage("", "Random fox image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("fox", "foxie");
    cr.registerAlias("fox", "foxi");
    cr.registerAlias("fox", "weff");

    cr.registerCommand("shibe", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.shibe", "weff"), dogFace(), await randomShibe())
    ))
        .setHelp(new HelpContent().setUsage("", "Random SHIBE image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("shibe", "shiba");

    cr.registerCommand("bird", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.bird", "peep"), "ovo", await randomBird())
    ))
        .setHelp(new HelpContent().setUsage("", "Random Birb image ovo"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("bird", "birb");
    cr.registerAlias("bird", "borb");
    cr.registerAlias("bird", "birbo");
};
