const giphy_api = require("giphy-api");
const config = require("../config");
const log = require("../modules/log");
const { randomItem } = require("../modules/util/array");

const BaseCommand = require("../class/BaseCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    if (!config.has("giphy.key")) return log.debug("config", "Found no API token for Giphy - Disabled gif command");

    const giphy = giphy_api(config.get("giphy.key"));

    const gifCommand = cr.register("gif", new TreeCommand)
        .setHelp(new HelpContent()
            .setUsage("<query>", "returns the top result for the given `query`")
            .addParameter("query", "What type of gif you want to have"))
        .setCategory(Category.IMAGE);
    
    gifCommand.registerSubCommand("random", new class extends BaseCommand {
        async call(message, query) {
            let gif;
            if (query === "") {
                gif = await giphy.random({
                    limit: 1,
                    rating: message.channel.nsfw ? "r" : "s"
                });
                if (!gif.data.image_original_url) {
                    throw new Error("Empty response for global random gif");
                }
            } else {
                gif = await giphy.random({
                    limit: 1,
                    tag: encodeURIComponent(query),
                    rating: message.channel.nsfw ? "r" : "g"
                });
                if (!gif.data.image_original_url) {
                    await message.channel.sendTranslated("No GIFs were found matching this query.");
                    return;
                }
            }

            const url = gif.data.image_original_url;

            await message.channel.send(url);
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<query>", "returns a random gif for the given `query`"));
    
    gifCommand.registerSubCommand("trending", new class extends BaseCommand {
        async call(message) {
            const gif = await giphy.trending({
                limit: 100
            });
            if (gif.data.length === 0) {
                await message.channel.sendTranslated("Apparently nothing is trending right now.");
                return;
            }

            const url = (await randomItem(gif.data)).images.fixed_height.url;

            await message.channel.send(url);
        }
    })
        .setHelp(new HelpContent()
            .setUsage("", "returns a random trending gif"));
    
    gifCommand.registerDefaultCommand(new class extends BaseCommand {
        async call(message, query) {
            if (query === "") return;

            const gif = await giphy.search({
                q: encodeURIComponent(query),
                limit: 1,
                rating: message.channel.nsfw ? "r" : "g"
            });
            if (!gif.data || gif.data.length === 0) {
                await message.channel.sendTranslated("No GIFs were found matching this query.");
                return;
            }

            const url = gif.data[0].images.fixed_height.url;

            await message.channel.send(url);
        }
    });

    gifCommand.registerSubCommandAlias("*", "top");
};