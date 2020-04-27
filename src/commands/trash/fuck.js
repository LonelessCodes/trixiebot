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

const { randomItem } = require("../../util/array");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent").default;
const Category = require("../../util/commands/Category").default;
const RateLimiter = require("../../util/commands/RateLimiter").default;
const TimeUnit = require("../../modules/TimeUnit").default;

const Translation = require("../../modules/i18n/Translation").default;

// Maybe remove translations again because fucks can be any random
// language when people of other languages add phrases

module.exports = function install(cr, { db }) {
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

        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            if (added_recently.filter(id => message.author.id === id).length > 5) {
                return new Translation("fuck.too_much", "Cool down, bro. I can't let you add so much at once! Come back in an hour or so.");
            }
            if (content.length <= 10 || content.length > 256) {
                return new Translation("fuck.out_of_range", "Text must be longer than 10 and shorter than 256 characters.");
            }
            if (/<[@#]!?(1|\d{17,19})>/g.test(content)) {
                return new Translation("fuck.no_mentions", "You may not add texts with mentioned roles, channels or users. That's just bull");
            }
            if (!/\$\{name\}/g.test(content)) {
                return new Translation("fuck.name_missing", "You must add `${name}` in the place the username should be set.");
            }
            if (await database.findOne({ lowercase: content.toLowerCase() })) {
                return new Translation("fuck.exists", "This phrase already exists!");
            }
            await database.insertOne({
                text: content,
                lowercase: content.toLowerCase(),
                author: message.author.tag,
                authorId: message.author.id,
            });
            added_recently.push(message.author.id);
            setTimeout(() => {
                added_recently.splice(added_recently.indexOf(message.author.id));
            }, 1000 * 60 * 60); // 60 minutes

            return new Translation("fuck.success", "Added!");
        }));

    fuckCommand.registerDefaultCommand(new SimpleCommand(async ({ message, prefix, mentions }) => {
        const mention = mentions.members.first() || message.member;

        const phrases = await database.find({ verified: true }).toArray(); // return only text and author
        if (phrases.length === 0) {
            return new Translation(
                "fuck.no_fucks",
                "I'm sorry, but... I don't have any fucks to give. Add fucks using `{{prefix}}fuck add`",
                { prefix }
            );
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
