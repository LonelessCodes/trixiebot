const giphy = require("giphy-api")(require("../../keys/giphy.json").key);
const log = require("../modules/log");
const Command = require("../class/Command");

Array.prototype.random = function randomItem() {
    return this[Math.floor(Math.random() * this.length)];
};

class GifCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;

        if (/^gif random\b/i.test(message.content)) {
            const query = message.content.substr(11);
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
                    tag: query,
                    rating: message.channel.nsfw ? "r" : "s"
                });
                if (!gif.data.image_original_url) {
                    await message.channel.send("No GIFs were found matching this query.");
                    log(`No random gifs found for query: ${query}`);
                    return;
                }
            }

            const url = gif.data.image_original_url;

            await message.channel.send(url);
            log(`Requested random gif ${gif.data.id} for ${query}`);
            return;
        }

        if (/^gif trending\b/i.test(message.content)) {
            const gif = await giphy.trending({
                limit: 100
            });
            if (gif.data.length === 0) {
                await message.channel.send("Apparently nothing is trending right now.");
                log("No gifs trending right now");
                return;
            }

            const url = gif.data.random().images.fixed_height.url;

            await message.channel.send(url);
            log(`Requested trending gif ${gif.data[0].id}`);
            return;
        }

        if (/^gif\b/i.test(message.content)) {
            const query = message.content.substr(4);
            if (query === "") {
                await message.channel.send(this.usage(message.prefix));
                log("Sent gif usage");
                return;
            }

            const gif = await giphy.search({
                q: query,
                limit: 1,
                rating: message.channel.nsfw ? "r" : "s"
            });
            if (!gif.data || gif.data.length === 0) {
                await message.channel.send("No GIFs were found matching this query.");
                log(`No gifs found for query: ${query}`);
                return;
            }

            const url = gif.data[0].images.fixed_height.url;

            await message.channel.send(url);
            log(`Requested top gif ${gif.data[0].id} for ${query}`);
            return;
        }
    }
    usage(prefix) {
        return `\`${prefix}gif <query>\` - returns the top result for the given \`query\`
\`${prefix}gif random <query>\` - returns a random gif for the given \`query\`
\`${prefix}gif trending\` - returns a random trending gif`;
    }
}

module.exports = GifCommand;
