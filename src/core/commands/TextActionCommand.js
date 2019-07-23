const { userToString } = require("../../util/util");
const BaseCommand = require("./BaseCommand");
const secureRandom = require("../../modules/random/secureRandom");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");
const MessageMentions = require("../../util/commands/MessageMentions");

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
        } else {
            await message.channel.send(phrase.replace(new RegExp("{{user}}", "g"), userToString(mention)));
        }
    }

    setAllowEveryone(v) {
        this.everyone = v;
        return this;
    }
}

module.exports = TextActionCommand;
