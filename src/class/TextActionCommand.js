const BaseCommand = require("./BaseCommand");
const secureRandom = require("random-number-csprng");

class TextActionCommand extends BaseCommand {
    constructor(content, noMentionMessage, permissions) {
        super(permissions);

        this.texts = content instanceof Array ? content : [content];
        this.noMentionMessage = noMentionMessage;
    }

    async run(message, content) {
        const mention = message.mentions.members.first();
        if (!mention) {
            await message.channel.sendTranslated(this.noMentionMessage);
            return;
        }

        for (const [, member] of message.mentions.members)
            content = content.replace(member.toString(), "");
        
        content = content.replace(/\s+/g, " ");

        let index = await secureRandom(0, this.texts.length - 1);
        if (content !== "") {
            try {
                index = Math.max(1, Math.min(this.texts.length, parseInt(content))) - 1;
            } catch (err) {
                err;
            }
        }
        const phrase = this.texts[index];
        await message.channel.send(phrase.replace(new RegExp("{{user}}", "g"), mention.displayName));
    }
}

module.exports = TextActionCommand;