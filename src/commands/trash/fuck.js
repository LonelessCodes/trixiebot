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

const { randomItem } = require("../../util/array");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");
const RateLimiter = require("../../util/commands/RateLimiter");
const TimeUnit = require("../../modules/TimeUnit");
const MessageMentions = require("../../util/commands/MessageMentions");

module.exports = function install(cr, client, config, db) {
    const added_recently = [];

    const database = db.collection("fuck");

    const fuckCommand = cr.registerCommand("fuck", new TreeCommand)
        .setExplicit(true)
        .setHelp(new HelpContent()
            .setDescription("Do something lewddd to another user.\nAll texts were submitted by other users. TrixieBot didn't take any part in creating those texts and we do our best efforts to remove harmful submissions, therefore all submissions must first be verified by one of my owners.")
            .setUsage("<user>")
            .addParameter("user", "the username of the user to fuck"))
        .setCategory(Category.ACTION);

    /**
     * SUB COMMANDS
     */

    fuckCommand.registerSubCommand("add", new OverloadCommand)
        .setHelp(new HelpContent()
            .setUsage("<text>", "Add your own phrase")
            .addParameter("text", "the text the bot is supposed to say. It must contain `${name}` in the place the username should be set. E.g.: `{{prefix}}fuck add rides ${name}'s skin bus into tuna town`"))
        .setRateLimiter(new RateLimiter(TimeUnit.HOUR, 1, 3))

        .registerOverload("1+", new SimpleCommand(async (message, text) => {
            if (added_recently.filter(id => message.author.id === id).length > 5) {
                await message.channel.send("Cool down, bro. I can't let you add so much at once! Come back in an hour or so.");
                return;
            }
            if (text.length <= 10 || text.length > 256) {
                await message.channel.send("Text must be longer than 10 and shorter than 256 characters.");
                return;
            }
            if (/<[@#]!?(1|\d{17,19})>/g.test(text)) {
                await message.channel.send("You may not add texts with mentioned roles, channels or users. That's just bull");
                return;
            }
            if (!/\$\{name\}/g.test(text)) {
                await message.channel.send("You must add `${name}` in the place the username should be set.");
                return;
            }
            if (await database.findOne({ lowercase: text.toLowerCase() })) {
                await message.channel.send("This phrase already exists!");
                return;
            }
            await database.insertOne({
                text,
                lowercase: text.toLowerCase(),
                author: message.author.tag,
                authorId: message.author.id,
            });
            added_recently.push(message.author.id);
            setTimeout(() => {
                added_recently.splice(added_recently.indexOf(message.author.id));
            }, 1000 * 60 * 60); // 60 minutes

            await message.channel.send("Added!");
        }));

    fuckCommand.registerDefaultCommand(new SimpleCommand(async (message, content) => {
        const mention = new MessageMentions(content, message.guild).members.first() || message.member;

        const phrases = await database.find({ verified: true }).toArray(); // return only text and author
        if (phrases.length === 0) {
            return `I'm sorry, but... I don't have any fucks to give. Add fucks using \`${message.prefix}fuck add\``;
        }

        const phrase = await randomItem(phrases);
        const username = mention.displayName;
        let text = phrase.text;
        text = text.replace(/\$\{name\}'s/g,
            username.toLowerCase().charAt(username.length - 1) === "s" ?
                `${username}'` :
                `${username}'s`);
        text = text.replace(/\$\{name\}/g, username);
        return text;
    }));
};