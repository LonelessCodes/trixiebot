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
const getTumblrBlog = require("../modules/getTumblrBlog");
const secureRandom = require("../modules/random/secureRandom").default;
const log = require("../log").default;

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const usernameRegExp = /@([\w-]+)\b/g;

module.exports = function install(cr) {
    if (!config.has("tumblr.key")) return log.namespace("config", "Found no API token for Tumblr - Disabled mlpquote command");

    let quotes = [];
    getTumblrBlog(config.get("tumblr.key"), "incorrectmylittleponyquotes.tumblr.com")
        .then(posts => posts
            .filter(post => post.tags.includes("incorrect my little pony quotes"))
            .map(post => post.body.trim())
            .filter(post => /\w+:/gi.test(post))
            .map(quote => quote.replace(usernameRegExp, (_, username) => `<http://${username}.tumblr.com>`)))
        .then(q => quotes = q)
        .then(() => log.namespace("mlpquote cmd")("Quotes loaded:", quotes.length))
        .catch(() => { /* Do nothing */ });

    cr.registerCommand("mlpquote", new SimpleCommand(async () => {
        if (quotes.length === 0) {
            return "Quotes not yet done loading :c come back in a few seconds to minutes";
        }

        return await secureRandom(quotes);
    }))
        .setHelp(new HelpContent()
            .setDescription("Gets you only a true incorrect my little pony quote. Parsed from https://incorrectmylittleponyquotes.tumblr.com"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);

    cr.registerAlias("mlpquote", "mlpquotes");
};
