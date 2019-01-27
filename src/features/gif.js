const giphy = require("giphy-api")(require("../../keys/giphy.json").key);
const log = require("../modules/log");
const secureRandom = require("../modules/secureRandom");

const BaseCommand = require("../class/BaseCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

Array.prototype.random = async function randomItem() {
    return await secureRandom(this);
};

module.exports = async function install(cr) {
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
                    log(`No random gifs found for query: ${query}`);
                    return;
                }
            }

            const url = gif.data.image_original_url;

            await message.channel.send(url);
            log(`Requested random gif ${gif.data.id} for ${query}`);
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
                log("No gifs trending right now");
                return;
            }

            const url = (await gif.data.random()).images.fixed_height.url;

            await message.channel.send(url);
            log(`Requested trending gif ${gif.data[0].id}`);
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
                log(`No gifs found for query: ${query}`);
                return;
            }

            const url = gif.data[0].images.fixed_height.url;

            await message.channel.send(url);
            log(`Requested top gif ${gif.data[0].id} for ${query}`);
        }
    });

    gifCommand.registerSubCommandAlias("*", "top");
};