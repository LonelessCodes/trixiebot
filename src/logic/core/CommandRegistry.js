const AliasCommand = require("../../class/AliasCommand");
const CCManager = require("../managers/CCManager");

class CommandRegistry {
    constructor(client, database) {
        this.cc = new CCManager(client, database);

        /** @type {Map<string, BaseCommand>} */
        this.commands = new Map;
    }


    registerCommand(id, command) {
        if (this.commands.has(id)) throw new Error("Command name already exists");

        this.commands.set(id, command);
        return command;
    }

    registerAlias(command, alias) {
        if (!this.commands.has(command)) throw new Error(command + " isn't in the command map...");
        if (this.commands.has(alias)) throw new Error("Alias '" + alias + "' is already registered in the command map...");

        const cmd = this.commands.get(command);
        cmd.aliases.push(alias);
        this.registerCommand(alias, new AliasCommand(command, cmd));
    }

    }
}

module.exports = CommandRegistry;
