const BaseCommand = require("./BaseCommand");

class TextCommand extends BaseCommand {
    constructor(content, permissions) {
        super(permissions);
        this.content = content instanceof Array ? content : [content];
    }

    async run(message) {
        await message.channel.send(this.content[Math.floor(Math.random() * this.content.length)]);
    }
}

module.exports = TextCommand;