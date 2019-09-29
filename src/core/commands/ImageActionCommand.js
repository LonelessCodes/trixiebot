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

const BaseCommand = require("./BaseCommand");
const { userToString } = require("../../util/util");
const secureRandom = require("../../modules/random/secureRandom");
const RateLimiter = require("../../util/commands/RateLimiter");
const TimeUnit = require("../../modules/TimeUnit");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");
const MessageMentions = require("../../util/commands/MessageMentions");

const { Attachment } = require("discord.js");

class TextActionCommand extends BaseCommand {
    constructor(image, content, noMentionMessage) {
        super();

        this.setRateLimiter(new RateLimiter(TimeUnit.SECOND, 10));
        this.setHelp(new HelpContent()
            // .setDescription(image + " someone!!!!!")
            .setUsage("<@user>"));
        this.setCategory(Category.ACTION);

        this.image = image;
        this.texts = content instanceof Array ? content : [content];
        this.noMentionMessage = noMentionMessage;
        this.everyone = false;
    }

    async run(message, command_name, content) {
        const mentions = new MessageMentions(content, message.guild);
        const mention = mentions.members.first();
        if (!mention && !mentions.everyone) {
            await message.channel.sendTranslated(this.noMentionMessage.replace(new RegExp("{{user}}", "g"), userToString(message.member)));
            return;
        }

        const phrase = await secureRandom(this.texts);
        const user = mentions.everyone ? `all ${message.guild.memberCount} users` : userToString(mention);

        const attachment = new Attachment(this.image);

        await message.channel.send(phrase.replace(new RegExp("{{user}}", "g"), user), attachment);
    }

    setAllowEveryone(v) {
        this.everyone = v;
        return this;
    }
}

module.exports = TextActionCommand;
