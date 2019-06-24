const BaseCommand = require("./BaseCommand");

class SimpleCommand extends BaseCommand {
    constructor(func = async () => {}, permissions) {
        super(permissions);

        this.func = func;
    }

    async run(message, command_name, content, pass_through, timer) {
        const result = await this.func(message, content, { pass_through, command_name, timer });
        if (!result) return;

        await message.channel.send(result);
    }
}

module.exports = SimpleCommand;