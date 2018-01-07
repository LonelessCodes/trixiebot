const giphy = require('giphy-api')(require("../keys/giphy.json").key);
const log = require("../modules/log");
const Command = require("../modules/Command");

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

const usage = `Usage:
\`!gif <query>\` - returns the top result for the given \`query\`
\`!gif random <query>\` - returns a random gif for the given \`query\`
\`!gif trending\` - returns a random trending gif`;

const command = new Command(async function onmessage(message) {
    if (message.author.bot) return;
    if (message.channel.type !== "text") return;
    
    let msg = message.content;
    while (/ \ /g.test(msg))
        msg = msg.replace(/ \ /g, " ");

    if (/^\!gif\ random/i.test(message.content)) {
        const query = msg.substring(12);
        let gif;
        if (query === "") {
            gif = await giphy.random({
                limit: 1,
                rating: "r"
            });
            if (!gif.data.image_original_url) {
                throw new Error("Empty response for global random gif");
            }
        } else {
            gif = await giphy.random({
                limit: 1,
                tag: query,
                rating: "r"
            });
            if (!gif.data.image_original_url) {
                message.channel.send("No GIFs were found matching this query.");
                return;
            }
        }

        const url = gif.data.image_original_url;

        await message.channel.send(url);
        log(`Requested random gif ${gif.data.id} for ${query}`);

        return;
    }
    if (/^\!gif\ trending/i.test(message.content)) {
        const gif = await giphy.trending({
            limit: 100
        });
        if (gif.data.length === 0) {
            message.channel.send("Apparently nothing is trending right now.");
            return;
        }

        const url = gif.data.random().images.fixed_height.url;

        await message.channel.send(url);
        log(`Requested trending gif ${gif.data[0].id}`);

        return;
    }
    if (/^\!gif/i.test(message.content)) {
        const query = msg.substring(5);
        if (query === "") {
            message.channel.send(usage);
            return;
        }

        const gif = await giphy.search({
            q: query,
            limit: 1,
            rating: "r"
        });
        if (gif.data.length === 0) {
            message.channel.send("No GIFs were found matching this query.");
            return;
        }

        const url = gif.data[0].images.fixed_height.url;

        await message.channel.send(url);
        log(`Requested top gif ${gif.data[0].id} for ${query}`);

        return;
    }
});

module.exports = command;
