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
const cheerio = require("cheerio");
const CONST = require("../const");
const Discord = require("discord.js");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

// Keep English, because results are always returned in English, since they are
// fetched from the English MLP Wikia

module.exports = function install(cr) {
    cr.registerCommand("mlp", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ content }) => {
            const searchRequest = await fetch(`http://mlp.wikia.com/api/v1/Search/List?query=${encodeURIComponent(content)}&format=json&limit=1`);
            const searchJson = await searchRequest.json();
            if (!searchJson.items || !searchJson.items[0]) {
                return "*shrug* nothing here apparently";
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
            parser("br").replaceWith("\n");

            const info = parser("table.infobox > tbody").first();

            const fields = [];
            let title = "";
            if (info.toArray().length) {
                title = info.find("tr > th")
                    .first()
                    .text()
                    .replace(info.find("tr > th")
                        .first()
                        .find("span")
                        .text() || "", str => ` ${str}`);

                info.find("tr")
                    .slice(3)
                    .filter(function filter() {
                        return parser(this).children().length > 1;
                    })
                    .slice(0, 10)
                    .each(function each() {
                        const found = parser(this).find("td");
                        if (!found.toArray().length) return;

                        const key = found.first().text();
                        if (/other links/i.test(key)) return;

                        let value = found.slice(1)
                            .text()
                            .split("\n")
                            .map(s => s.trim())
                            .join("\n");
                        if (key.replace(/[\n\r]/g, "") === "" || value.replace(/[\n\r]/g, "") === "") return;
                        if (value.length > 512) {
                            value = value.slice(0, 512 - 3) + "...";
                        }

                        fields.push({
                            key,
                            value,
                        });
                    });
            } else {
                title = abstract.title;
            }

            const embed = new Discord.MessageEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .setTitle(title)
                .setDescription(abstract.abstract
                    .replace(new RegExp(content, "gi"), substring => `**${substring}**`)
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
                            height: thumb.attr("height"),
                        };
                    } else {
                        embed.setThumbnail(abstract.thumbnail);
                    }
                } else {
                    embed.setThumbnail(abstract.thumbnail);
                }
            }

            for (const field of fields)
                embed.addField(field.key, field.value, true);

            return { embed };
        }))
        .setHelp(new HelpContent()
            .setDescription("Query the MLP Wikia for fun! Everything there: ALL the ponies, ALL the episodes, ALL the places.")
            .setUsage("<query>", "come look it up with me owo")
            .addParameter("query", "what you would like to look up"))
        .setCategory(Category.UTIL)
        .setScope(CommandScope.ALL, true);

    cr.registerAlias("mlp", "pony");
};
