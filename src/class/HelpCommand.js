const BaseCommand = require("./BaseCommand");
const HelpBuilder = require("../logic/commands/HelpBuilder");

class OverloadCommand extends BaseCommand {
    constructor(permissions) {
        super(permissions);

        this._linked_to = this;
    }

    async run(message, command_name) {
        await HelpBuilder.sendHelp(message, command_name, this._linked_to || this);
    }

    linkTo(command) {
        this._linked_to = command;
        return this;
    }
}

module.exports = OverloadCommand;