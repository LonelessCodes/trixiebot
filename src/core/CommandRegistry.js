/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

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
