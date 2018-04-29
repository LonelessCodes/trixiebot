const fetch = require("node-fetch");
const log = require("../modules/log");
const cheerio = require("cheerio");
const Discord = require("discord.js");
const Command = require("../class/Command");

class CatCommand extends Command {
    async onmessage(message) {
        if (/^mlp\b/i.test(message.content)) {
            const query = message.content.substr(4).trim();
            if (query === "") {
                await message.channel.send(this.usage(message.prefix));
                log("Requested usage of mlp command");
                return;
            }

            const searchRequest = await fetch(`http://mlp.wikia.com/api/v1/Search/List?query=${query}&format=json&limit=1`);
            const searchJson = await searchRequest.json();
            if (!searchJson.items || !searchJson.items[0]) {
                await message.channel.send("*shrug* nothing here apparently");
                log(`No results for wikia query ${query}`);
                return;
            }

            const item = searchJson.items[0];
            const id = item.id.toString();

            const abstractRequest = await fetch(`http://mlp.wikia.com/api/v1/Articles/Details?ids=${id}&format=json&abstract=500`);
            /**
             * @type {{items: { [id: string]: {id: number; title: string; ns: number; url: string; comments: number; type: string; abstract: string; thumbnail: string; }}}}
             */
            const abstractJson = await abstractRequest.json();

            const abstract = abstractJson.items[id];
            const pageURL = `http://mlp.wikia.com${abstract.url}`;

            const pageRequest = await fetch(pageURL);
            const pageHTML = await pageRequest.text();
            const parser = cheerio.load(pageHTML);

            const info = parser("table.infobox > tbody").first();
            info.find("br").replaceWith("\n");

            const fields = new Array;
            let title = "";
            if (info.toArray().length) {
                title = info.find("tr > th")
                    .first()
                    .text()
                    .replace(info.find("tr > th")
                        .first()
                        .find("span")
                        .text() || "", str => ` ${str}`);

                info.find("tr").slice(3).filter(function () {
                    return parser(this).children().length > 1;
                }).slice(0, 8).each(function () {
                    const found = parser(this).find("td");
    
                    const key = found.first().text();
                    if (/other links/i.test(key)) return;
    
                    const value = found.slice(1).text();
                    if (key.replace(/[\n\r]/g, "") === "" || value.replace(/[\n\r]/g, "") === "") return;
    
                    fields.push({
                        key,
                        value: value.split("\n").map(s => s.trim()).join("\n")
                    });
                });
            } else {
                title = abstract.title;
            }

            const embed = new Discord.RichEmbed()
                .setTitle(title)
                .setDescription(abstract.abstract
                    .replace(new RegExp(query, "gi"), substring => `**${substring}**`)
                    .replace(/ *\[[\w ]+\] */gi, "")) // get rid of reference squared brackets
                .setURL(pageURL)
                .setFooter(`type: ${abstract.type} | ${abstract.comments} ${abstract.comments === 1 ? "comment" : "comments"} | Quality of the result: ${item.quality}%`);

            if (abstract.thumbnail) {
                if (info.toArray().length) {
                    const thumb = info.find("img").first();
                    if (thumb.toArray().length) {
                        embed.thumbnail = {
                            url: thumb.data("src"),
                            width: thumb.attr("width"),
                            height: thumb.attr("height")
                        };
                    } else {
                        embed.setThumbnail(abstract.thumbnail);
                    }
                } else {
                    embed.setThumbnail(abstract.thumbnail);
                }
            }

            for (let field of fields) {
                embed.addField(field.key, field.value, true);
            }

            await message.channel.send({ embed });
            log("Fulfilled wikia query for ${query} successfully.");
            return;
        }
    }
    usage(prefix) {
        return `\`${prefix}mlp <query>\`
\`query\` - come look it up with me owo`;
    }
}

module.exports = CatCommand;
