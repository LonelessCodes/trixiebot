/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

const { userToString, progressBar } = require("../../util/util");
const { doNothing } = require("../../util/util");
const CONST = require("../../const").default;
const Queue = require("../../modules/Queue").default;
const fs = require("fs-extra");
const path = require("path");
/**
 * @param {string} txt
 * @param {string} font
 * @returns {Promise<string>}
 */
const figlet = (txt, font) =>
    new Promise((resolve, reject) => {
        require("figlet")(txt, font, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const HelpContent = require("../../util/commands/HelpContent").default;
const Category = require("../../util/commands/Category").default;
const CalendarRange = require("../../modules/calendar/CalendarRange").default;

const bad_words_array = fs.readFileSync(path.join(__dirname, "..", "..", "..", "assets", "text", "bad_words.txt"), "utf8").split(",");
for (let word of bad_words_array) {
    word = word.replace(/-/g, " ");
    if (!bad_words_array.includes(word)) bad_words_array.push(word);
}

const regexp = new RegExp(`\\b(${bad_words_array.join("|")})\\b`, "gi");

module.exports = function install(cr, { db }) {
    const queue = new Queue;

    const database = db.collection("santaslist");

    cr.registerCommand("naughty", new SimpleCommand(async message => {
        const progress = await message.channel.send(`${progressBar(0.0, 12, "█", "░")} | Waiting in queue...`);

        await queue.push(async () => {
            const user = message.author;

            /** @type {Discord.TextChannel[]} */
            const channels = message.guild.channels.cache
                .array()
                .filter(
                    c => c.type === "text" && c.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.VIEW_CHANNEL)
                );

            const step = 1 / channels.length;
            const limit = 4000;
            let total = 0;
            let total_messages = 0;
            let total_user_messages = 0;
            let bad_words = 0;
            const bad_words_used = {};
            for (let i = 0; i < channels.length; i++) {
                const channel = channels[i];

                let messages = 0;
                let j = 0;
                let lastID = null;
                while (messages < limit) {
                    const m = await channel.messages.fetch({ limit: 100, before: lastID });
                    if (!m.size) break;

                    m.forEach(message => {
                        if (message.author.id !== user.id) return;
                        if (!message.content) return;

                        const matches = message.content.match(regexp);
                        bad_words += (matches || []).length;
                        if (matches) {
                            for (let match of matches) {
                                match = match.toLowerCase();
                                if (!bad_words_used[match]) bad_words_used[match] = 0;
                                bad_words_used[match]++;
                            }
                        }
                        total_user_messages++;
                        total += message.content.split(/\s+/g).length;
                    });

                    messages += m.size;
                    lastID = m.last().id;

                    if (!(j % 8)) {
                        const v = i / channels.length + (messages / limit) * step;
                        progress.edit(`${progressBar(v, 12, "█", "░")} | Fetching messages...`).catch(doNothing);
                    }
                    j++;
                }

                total_messages += messages;
            }

            await progress.edit(`${progressBar(1, 12, "█", "░")} Done!`);

            const naughty_percent = Math.min((bad_words / total) * 45, 1);

            const embed = new Discord.MessageEmbed();

            const number = (await figlet(`${Math.round(naughty_percent * 100)}%`, "Univers")).split("\n");
            const str = "```\n" + number.slice(0, number.length - 1).join("\n") + "  Naughty\n```\n";

            if (naughty_percent >= 0.5) {
                embed.setColor(CONST.COLOR.ERROR);
                embed.setThumbnail("https://derpicdn.net/img/view/2018/4/9/1703511.png");
                embed.setTitle(`${userToString(user)} is on the Naughty list`);
                embed.setDescription(
                    `${str}Oh dear ... You swore a total of **${bad_words}** times in the messages we analysed (${total_user_messages}). It's a lump of coal in your stocking this year, you naughty thing.`
                );
            } else {
                embed.setColor(CONST.COLOR.SUCCESS);
                embed.setTitle(`${userToString(user)} is on the Nice list`);
                if (naughty_percent === 0) {
                    embed.setDescription(
                        `${str}Wow! You didn't swear at all in the messages we analysed (${total_user_messages}). Come on! Live a little. No one can be good all the time.`
                    );
                } else if (naughty_percent < 0.2) {
                    embed.setDescription(
                        `${str}Wow! You only swore **${bad_words}** times in the messages we analysed (${total_user_messages}). Come on! Live a little. No one can be good all the time`
                    );
                } else {
                    embed.setColor(CONST.COLOR.WARNING);
                    embed.setDescription(
                        `${str}Close call! You swore **${bad_words}** times in the messages we analysed (${total_user_messages}). Come on! Live a little. No one can be good all the time`
                    );
                }
            }

            if (Object.keys(bad_words_used).length) {
                const words = Object.keys(bad_words_used)
                    .map(key => [key, bad_words_used[key]])
                    .sort((a, b) => b[1] - a[1]);

                const str = [];
                for (const word of words.slice(0, 20)) {
                    str.push(`**${word[0].toLowerCase()}** (${word[1]})`);
                }
                embed.addField("Top Words", str.join(", "));
            }

            await message.channel.send({ embed });

            await database.updateOne({ guildId: message.guild.id, userId: user.id }, { $set: { naughtyLevel: naughty_percent, badWords: bad_words, total, totalMessages: total_messages } }, { upsert: true });
        });
    }))
        .setHelp(new HelpContent()
            .setDescription("It's shortly before Christmas again! Have you been good this year, or will your potty mouth on Discord leave you with lump of coal in your stocking on Christmas day? It’s time to find out!"))
        .setCategory(Category.FUN)
        .setSeason(new CalendarRange("0 0 0 1 11 *", "0 0 0 27 11 *"));
    cr.registerAlias("naughty", "nice");
};
