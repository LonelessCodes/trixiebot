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

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Translation = require("../modules/i18n/Translation");
const TranslationMerge = require("../modules/i18n/TranslationMerge");

async function randomCat(reconnectTries = 0) {
    let file;
    try {
        const response = await fetch("http://aws.random.cat/meow");
        const result = await response.json();
        file = result.file;
    } catch (err) {
        reconnectTries++;
        if (reconnectTries > 5) throw err;
        file = await randomCat(reconnectTries);
    }

    return file;
}

async function randomDog() {
    const response = await fetch("https://random.dog/woof.json");
    const result = await response.json();

    return result.url;
}

async function randomFox() {
    const response = await fetch("https://randomfox.ca/floof");
    const result = await response.json();

    return result.image;
}

async function randomShibe() {
    const response = await fetch("http://shibe.online/api/shibes?count=1&urls=true&httpsUrls=true");
    const result = await response.json();

    return result[0];
}

async function randomBird() {
    const response = await fetch("http://shibe.online/api/birds?count=1&urls=true&httpsUrls=true");
    const result = await response.json();

    return result[0];
}

module.exports = function install(cr) {
    cr.registerCommand("cat", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.cat", "meow"), catFace(), await randomCat())
    ))
        .setHelp(new HelpContent().setDescription("Random cat image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("cat", "kitty");

    cr.registerCommand("dog", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.dog", "woof"), dogFace(), await randomDog())
    ))
        .setHelp(new HelpContent().setDescription("Random dog image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("dog", "doggo");
    cr.registerAlias("dog", "puppy");
    cr.registerAlias("dog", "bork");
    cr.registerAlias("dog", "pup");

    cr.registerCommand("fox", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.fox", "yip"), "🦊", await randomFox())
    ))
        .setHelp(new HelpContent().setDescription("Random fox image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("fox", "foxie");
    cr.registerAlias("fox", "foxi");
    cr.registerAlias("fox", "weff");

    cr.registerCommand("shibe", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.shibe", "weff"), dogFace(), await randomShibe())
    ))
        .setHelp(new HelpContent().setDescription("Random SHIBE image :3"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("shibe", "shiba");

    cr.registerCommand("bird", new SimpleCommand(async () =>
        new TranslationMerge(new Translation("animal.bird", "peep"), "ovo", await randomBird())
    ))
        .setHelp(new HelpContent().setDescription("Random Birb image ovo"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("bird", "birb");
    cr.registerAlias("bird", "borb");
    cr.registerAlias("bird", "birbo");
};
