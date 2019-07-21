const BaseCommand = require("./BaseCommand");
const secureRandom = require("../../modules/random/secureRandom");

class TextCommand extends BaseCommand {
    constructor(content, permissions) {
        super(permissions);
        this.content = content instanceof Array ? content : [content];
    }

    async run(message) {
        await message.channel.send(await secureRandom(this.content));
    }
}

module.exports = TextCommand;