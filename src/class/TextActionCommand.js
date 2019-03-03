const { userToString } = require("../modules/util");
const BaseCommand = require("./BaseCommand");
const secureRandom = require("../modules/secureRandom");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");
const MessageMentions = require("../modules/MessageMentions");

class TextActionCommand extends BaseCommand {
    constructor(description, content, noMentionMessage, permissions) {
        super(permissions);

        this.setHelp(new HelpContent()
            .setDescription(description)
            .setUsage("<@user>"));
        this.setCategory(Category.ACTION);

        this.texts = content instanceof Array ? content : [content];
        this.noMentionMessage = noMentionMessage;
        this.everyone = false;
    }

    async run(message, command_name, content) {
        const mentions = new MessageMentions(content, message.guild);
        const mention = mentions.members.first();
        if (!mention && !mentions.everyone) {
            await message.channel.sendTranslated(this.noMentionMessage);
            return;
        }

        const phrase = await secureRandom(this.texts);

        if (mentions.everyone) {
            await message.channel.send(phrase.replace(new RegExp("{{user}}", "g"), `all ${message.guild.members.size} users`));
            return;
        }
        else await message.channel.send(phrase.replace(new RegExp("{{user}}", "g"), userToString(mention)));
    }

    setAllowEveryone(v) {
        this.everyone = v;
        return this;
    }
}

module.exports = TextActionCommand;