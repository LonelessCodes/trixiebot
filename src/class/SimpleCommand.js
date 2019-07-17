const BaseCommand = require("./BaseCommand");

// eslint-disable-next-line no-unused-vars
const CommandPermission = require("../logic/commands/CommandPermission");
// eslint-disable-next-line no-unused-vars
const { Message } = require("discord.js");
// eslint-disable-next-line no-unused-vars
const { NanoTimer } = require("../modules/NanoTimer");

class SimpleCommand extends BaseCommand {
    /**
     * @param {(message: Message, content: string, add: { pass_through: any, command_name: string, timer: NanoTimer }) => any} func 
     * @param {CommandPermission} permissions 
     */
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