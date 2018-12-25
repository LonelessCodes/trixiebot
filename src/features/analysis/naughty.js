const { userToString } = require("../modules/utils");
const CONST = require("../../modules/CONST");
const Queue = require("../../logic/Queue");
const fs = require("fs-extra");
const path = require("path");
const { promisify } = require("util");
const figlet = promisify(require("figlet"));
const Discord = require("discord.js");

const BaseCommand = require("../../class/BaseCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");

figlet.parseFont("univers", fs.readFileSync(path.join(__dirname, "..", "..", "..", "resources", "figlet", "univers.flf"), "utf8"));

const bad_words_array = (fs.readFileSync(path.join(__dirname, "..", "..", "..", "resources", "text", "bad_words.txt"), "utf8")).split(",");
for (let word of bad_words_array) {
    word = word.replace(/-/g, " ");
    if (!bad_words_array.includes(word)) bad_words_array.push(word);
}

const regexp = new RegExp(`\\b(${bad_words_array.join("|")})\\b`, "gi");

function progressBar(v, a, b) {
    const length = 12;
    const str = new Array(length);
    str.fill(a);
    str.fill(b, Math.round(v * length));
    return `${str.join("")} ${(v * 100).toFixed(1)}%`;
}

module.exports = async function install(cr, client, config, db) {
    const queue = new Queue;

    const database = db.collection("santaslist");

    cr.register("naughty", new class extends BaseCommand {
        async call(message) {
            const progress = await message.channel.send(`${progressBar(0.0, "█", "░")} | Waiting in queue...`);

            queue.push(async () => {
                const user = message.author;

                const channels = message.guild.channels.array().filter(c => c.type === "text" &&
                    c.memberPermissions(message.guild.me).has(Discord.Permissions.FLAGS.READ_MESSAGES));

                const step = 1 / channels.length;
                const limit = 4000;
                let total = 0;
                let total_messages = 0;
                let total_user_messages = 0;
                let bad_words = 0;
                const bad_words_used = new Object;
                for (let i = 0; i < channels.length; i++) {
                    const channel = channels[i];

                    let messages = 0;
                    let j = 0;
                    let lastID = null;
                    while (messages < limit) {
                        const m = await channel.fetchMessages({ limit: 100, before: lastID });
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

                        if (!(j % 8)) progress.edit(`${progressBar(i / channels.length + (messages / limit) * step, "█", "░")} | Fetching messages...`);
                        j++;
                    }

                    total_messages += messages;
                }

                await progress.edit(`${progressBar(1, "█", "░")} Done!`);

                const naughty_percent = Math.min(bad_words / total * 45, 1);

                const embed = new Discord.RichEmbed;

                const number = (await figlet(`${Math.round(naughty_percent * 100)}%`, "univers")).split("\n");
                let str = "```\n" + number.slice(0, number.length - 1).join("\n") + "  Naughty" + "\n```\n";

                if (naughty_percent >= 0.5) {
                    embed.setColor(CONST.COLOR.ERROR);
                    embed.setThumbnail("https://derpicdn.net/img/view/2018/4/9/1703511.png");
                    embed.setTitle(`${userToString(user)} is on the Naughty list`);
                    embed.setDescription(`${str}Oh dear ... You swore a total of **${bad_words}** times in the messages we analysed (${total_user_messages}). It's a lump of coal in your stocking this year, you naughty thing.`);
                } else {
                    embed.setColor(0x67c23a);
                    embed.setThumbnail("https://derpicdn.net/img/view/2018/11/13/1881039.png");
                    embed.setTitle(`${userToString(user)} is on the Nice list`);
                    if (naughty_percent === 0) {
                        embed.setDescription(`${str}Wow! You didn't swear at all in the messages we analysed (${total_user_messages}). Come on! Live a little. No one can be good all the time.`);
                    } else if (naughty_percent < 0.2) {
                        embed.setDescription(`${str}Wow! You only swore **${bad_words}** times in the messages we analysed (${total_user_messages}). Come on! Live a little. No one can be good all the time`);
                    } else {
                        embed.setColor(CONST.COLOR.WARNING);
                        embed.setDescription(`${str}Close call! You swore **${bad_words}** times in the messages we analysed (${total_user_messages}). Come on! Live a little. No one can be good all the time`);
                    }
                    embed.setFooter("Art by ItsSpoopsB");
                }

                if (Object.keys(bad_words_used).length) {
                    const words = Object.keys(bad_words_used).map(key => [key, bad_words_used[key]]).sort((a, b) => b[1] - a[1]);

                    let str = [];
                    for (const word of words.slice(0, 20)) {
                        str.push(`**${word[0].toLowerCase()}** (${word[1]})`);
                    }
                    embed.addField("Top Words", str.join(", "));
                }

                await message.channel.send({ embed });

                await database.updateOne({ guildId: message.guild.id, userId: user.id }, { $set: { naughtyLevel: naughty_percent, badWords: bad_words, total, totalMessages: total_messages } }, { upsert: true });
            });
        }
    })
        .setHelp(new HelpContent()
            .setDescription("It's shortly before Christmas again! Have you been good this year, or will your potty mouth on Discord leave you with lump of coal in your stocking on Christmas day? It’s time to find out!"))
        .setCategory(Category.ANALYSIS);
    cr.registerAlias("naughty", "nice");
};