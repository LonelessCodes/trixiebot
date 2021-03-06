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

const BaseCommand = require("./BaseCommand").default;
const { userToString } = require("../../util/util");
const RateLimiter = require("../../util/commands/RateLimiter").default;
const TimeUnit = require("../../modules/TimeUnit").default;
const HelpContent = require("../../util/commands/HelpContent").default;
const Category = require("../../util/commands/Category").default;
const secureRandom = require("../../modules/random/secureRandom").default;

const { MessageAttachment } = require("discord.js");
const TranslationFormatter = require("../../modules/i18n/TranslationFormatter").default;
const Translation = require("../../modules/i18n/Translation").default;

class ImageActionCommand extends BaseCommand {
    constructor(image, content, noMentionMessage) {
        super();

        this.setRateLimiter(new RateLimiter(TimeUnit.SECOND, 10));
        this.setHelp(
            new HelpContent()
                // .setDescription(image + " someone!!!!!")
                .setUsage("<@user>")
        );
        this.setCategory(Category.ACTION);

        this.image = image;
        this.texts = content instanceof Array ? content : [content];
        this.noMentionMessage = noMentionMessage;
        this.everyone = false;
    }

    async run(context) {
        const mention = context.mentions.members.first();
        if (!mention && !context.mentions.everyone) {
            await context.send(new TranslationFormatter(this.noMentionMessage, { user: userToString(context.member) }));
            return;
        }

        const phrase = await secureRandom(this.texts);
        const user = context.mentions.everyone
            ? new Translation("textaction.everyone", "all {{count}} users", { count: context.guild.memberCount })
            : userToString(mention);

        const attachment = new MessageAttachment(this.image);

        await context.send(new TranslationFormatter(phrase, { user }), attachment);
    }

    setAllowEveryone(v) {
        this.everyone = v;
        return this;
    }
}

module.exports = ImageActionCommand;
