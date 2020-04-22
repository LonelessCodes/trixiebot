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

const giphy_api = require("giphy-api");
const config = require("../config").default;
const log = require("../log").default;
const { randomItem } = require("../util/array");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Translation = require("../modules/i18n/Translation").default;

module.exports = function install(cr) {
    if (!config.has("giphy.key")) return log.namespace("config", "Found no API token for Giphy - Disabled gif command");

    const giphy = giphy_api(config.get("giphy.key"));

    const gifCommand = cr.registerCommand("gif", new TreeCommand)
        .setHelp(new HelpContent()
            .setUsage("<query>", "returns the top result for the given `query`")
            .addParameter("query", "What type of gif you want to have"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL, true);

    gifCommand.registerSubCommand("random", new OverloadCommand)
        .registerOverload("0", new SimpleCommand(async message => {
            const gif = await giphy.random({
                limit: 1,
                rating: message.channel.nsfw ? "r" : "g",
            });
            if (!gif.data.image_original_url) return new Translation("gif.empty", "Empty response for global random gif");

            return gif.data.image_original_url;
        }))
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const gif = await giphy.random({
                limit: 1,
                tag: encodeURIComponent(content),
                rating: message.channel.nsfw ? "r" : "g",
            });
            if (!gif.data.image_original_url) {
                return new Translation("gif.empty_response", "No GIFs were found matching this query.");
            }

            return gif.data.image_original_url;
        }))
        .setHelp(new HelpContent()
            .setUsage("<query>", "returns a random gif for the given `query`"));

    gifCommand.registerSubCommand("trending", new SimpleCommand(async () => {
        const gif = await giphy.trending({
            limit: 100,
        });
        if (gif.data.length === 0) {
            return new Translation("gif.nothing_trending", "Apparently nothing is trending right now.");
        }

        const item = await randomItem(gif.data);
        return item.images.fixed_height.url;
    }))
        .setHelp(new HelpContent()
            .setUsage("", "returns a random trending gif"));

    gifCommand.registerDefaultCommand(new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const gif = await giphy.search({
                q: encodeURIComponent(content),
                limit: 1,
                rating: message.channel.nsfw ? "r" : "g",
            });
            if (!gif.data || gif.data.length === 0) {
                return new Translation("gif.empty_response", "No GIFs were found matching this query.");
            }

            return gif.data[0].images.fixed_height.url;
        }));

    gifCommand.registerSubCommandAlias("*", "top");
};
