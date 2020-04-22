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

const config = require("../config").default;
const log = require("../log").default;
const Derpibooru = require("../modules/Derpibooru");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Translation = require("../modules/i18n/Translation").default;

const filter_tags = ["underage", "foalcon", "bulimia", "self harm", "suicide", "animal cruelty", "gore", "foal abuse"];

const tags = ["pony", "vulva", "-penis", "nudity", "-photo", ...filter_tags.map(tag => "-" + tag), "upvotes.gte:150"];

async function process(key) {
    const image = await Derpibooru.random(key, tags);
    if (!image) return new Translation("general.not_found", "The **Great and Powerful Trixie** c-... coul-... *couldn't find anything*. There, I said it...");
    const artists = Derpibooru.getArtists(image.tags);

    let str = "";
    if (artists.length) str += artists.map(a => `**${a}**`).join(", ") + " ";
    str += `*<https://derpibooru.org/images/${image.id}>* `;
    str += image.representations.full;

    return str;
}

module.exports = function install(cr) {
    if (!config.has("derpibooru.key")) return log.namespace("config", "Found no API token for Derpibooru - Disabled horsepussy command");

    cr.registerCommand("horsepussy", new SimpleCommand(() => process(config.get("derpibooru.key"))))
        .setHelp(new HelpContent().setUsage("", "Get some gud quality horse pussi OwO"))
        .setExplicit(true)
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);

    cr.registerAlias("horsepussy", "horsepussi");
    cr.registerAlias("horsepussy", "ponypussy");
    cr.registerAlias("horsepussy", "ponypussi");
    cr.registerAlias("horsepussy", "ponepussi");
    cr.registerAlias("horsepussy", "ponypoossy");
};
