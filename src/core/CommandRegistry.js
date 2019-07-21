const AliasCommand = require("./commands/AliasCommand");
const CCManager = require("./managers/CCManager");

class CommandRegistry {
    constructor(client, database) {
        this.CC = new CCManager(client, database);

        /** @type {Map<string, BaseCommand>} */
        this.commands = new Map;
        /** @type {Map<string|RegExp, BaseCommand>} */
        this.keywords = new Map;
    }

    // Classical Commands

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

    getCommand(command_name) {
        const command = this.commands.get(command_name);
        if (command) return command;
    }

    // Keyword Commands

    registerKeyword(match, command) {
        if (this.keywords.has(match)) throw new Error("Keyword name already exists");

        this.keywords.set(match, command);
        return command;
    }

    getKeyword(content) {
        for (let [regex, cmd] of this.keywords) {
            if (typeof regex === "string" && content.includes(regex)) return [regex, cmd];
            if (regex instanceof RegExp && regex.test(content)) return [regex, cmd];
        }
    }

    *[Symbol.iterator]() {
        yield* this.commands;
        yield* this.keywords;
    }
}

module.exports = CommandRegistry;
