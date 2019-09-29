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

const CONST = require("../const");
const RandomChance = require("../modules/random/RandomChance");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Translation = require("../modules/i18n/Translation");
const TranslationEmbed = require("../modules/i18n/TranslationEmbed");
const TranslationMerge = require("../modules/i18n/TranslationMerge");

const replies = new RandomChance();
replies.add({
    text: new Translation("8ball.pos0", "It is certain"),
    type: 1,
}, 2);
replies.add({
    text: new Translation("8ball.pos1", "Yes – definitely"),
    type: 1,
}, 2);
replies.add({
    text: new Translation("8ball.pos2", "Without a doubt"),
    type: 1,
}, 2);
replies.add({
    text: new Translation("8ball.pos3", "Outlook good"),
    type: 1,
}, 2);
replies.add({
    text: new Translation("8ball.pos4", "Ye"),
    type: 1,
}, 2);
replies.add({
    text: new Translation("8ball.pos5", "You may rely on it"),
    type: 1,
}, 2);
replies.add({
    text: new Translation("8ball.pos6", "As I see it, yes"),
    type: 1,
}, 2);
replies.add({
    text: new Translation("8ball.pos7", "Most likely"),
    type: 1,
}, 2);
replies.add({
    text: new Translation("8ball.pos8", "Signs point to yes"),
    type: 1,
}, 2);
replies.add({
    text: new Translation("8ball.pos9", "It is decidedly so"),
    type: 1,
}, 2);

replies.add({
    text: new Translation("8ball.neg0", "Very doubtful"),
    type: -1,
}, 4);
replies.add({
    text: new Translation("8ball.neg1", "My sources say no"),
    type: -1,
}, 4);
replies.add({
    text: new Translation("8ball.neg2", "Outlook not so good"),
    type: -1,
}, 4);
replies.add({
    text: new Translation("8ball.neg3", "Don't count on it"),
    type: -1,
}, 4);
replies.add({
    text: new Translation("8ball.neg4", "No"),
    type: -1,
}, 4);

replies.add({
    text: new Translation("8ball.ntr0", "Cannot predict now"),
    type: 0,
}, 1);
replies.add({
    text: new Translation("8ball.ntr1", "Better not tell you now"),
    type: 0,
}, 1);
replies.add({
    text: new Translation("8ball.ntr2", "Concentrate and ask again"),
    type: 0,
}, 1);
replies.add({
    text: new Translation("8ball.ntr3", "Reply hazy, try again"),
    type: 0,
}, 1);
replies.add({
    text: new Translation("8ball.ntr4", "Ask again later"),
    type: 0,
}, 1);

module.exports = function install(cr) {
    cr.registerCommand("8ball", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async () => {
            /** @type {{ text: string; type: number; }} */
            const reply = await replies.random();

            let emoji = "";
            switch (reply.type) {
                case 1:
                    emoji = ":white_check_mark:";
                    break;
                case -1:
                    emoji = ":x:";
                    break;
                case 0:
                    emoji = ":crystal_ball:";
                    break;
            }

            return new TranslationEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .setTitle(new TranslationMerge(reply.text, emoji));
        }))
        .setHelp(new HelpContent()
            .setDescription("An easy way to find out the quick answer to ANY yes or no question!!!\nYou won't believe it yourself. Spoopy")
            .setUsage("<question>")
            .addParameter("question", "The question you are eager to ask"))
        .setCategory(Category.MISC)
        .setScope(CommandScope.ALL);
    cr.registerAlias("8ball", "tellme");
    cr.registerAlias("8ball", "8");
};
