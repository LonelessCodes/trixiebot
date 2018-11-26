const BaseCommand = require("./BaseCommand");
const secureRandom = require("random-number-csprng");

class TextCommand extends BaseCommand {
    constructor(content, permissions) {
        super(permissions);
        this.content = content instanceof Array ? content : [content];
    }

    async run(message) {
        await message.channel.send(this.content[await secureRandom(0, this.content.length - 1)]);
    }
}

module.exports = TextCommand;