const { userToString } = require("../modules/util");
const BaseCommand = require("./BaseCommand");
const secureRandom = require("../modules/secureRandom");
const RateLimiter = require("../logic/RateLimiter");
const TimeUnit = require("../modules/TimeUnit");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

const { Attachment } = require("discord.js");

class TextActionCommand extends BaseCommand {
    constructor(image, content, noMentionMessage, permissions) {
        super(permissions);

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

    async run(message) {
        const mention = message.mentions.members.first();
        if (!mention && !message.mentions.everyone) {
            await message.channel.sendTranslated(this.noMentionMessage);
            return;
        }

        const phrase = await secureRandom(this.texts);
        const user = message.mentions.everyone ? `all ${message.guild.members.size} users` : userToString(mention);

        const attachment = new Attachment(this.image);

        await message.channel.send(phrase.replace(new RegExp("{{user}}", "g"), user), attachment);
    }

    setAllowEveryone(v) {
        this.everyone = v;
        return this;
    }
}

module.exports = TextActionCommand;