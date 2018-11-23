const BaseCommand = require("./BaseCommand");

class TreeCommand extends BaseCommand {
    constructor() {
        super();

        this.sub_commands = new Map;
    }

    run(message, command_name) {
        const args = splitArgs(message.content, 2);

        if (this.sub_commands.size < 1) {
            throw new Error("No SubCommands registered");
        }

        let command = this.sub_commands.get(args[0]);
        let is_default = false;
        if (!command) {
            command = this.sub_commands.get("*");
            is_default = true;
        }
        if (!command)
            return; //Use SimpleTreeCommand then?

        command.run(message, command_name + (is_default ? "" : " " + args[0]), is_default ? message.content : args[1]);
    }

    registerSubCommand(id, command) {
        if (this.sub_commands.has(id)) throw new Error("Command name already exists");

        this.sub_commands.set(id, command);
        return command;
    }

    registerSubCommandAlias(command, alias) {
        if (!this.sub_commands.has(command)) throw new Error(command + " isn't in the command map...");
        if (this.sub_command.has(alias)) throw new Error("Alias '" + alias + "' is already registered in the command map...");

        this.register(alias, new AliasCommand(alias, command, this.sub_commands.get(command)));
    }

    registerDefaultCommand(command) {
        this.registerSubCommand("*", command);
        return command;
    }
}

module.exports = TreeCommand;