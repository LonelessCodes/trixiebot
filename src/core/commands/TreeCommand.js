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

const BaseCommand = require("./BaseCommand");
const AliasCommand = require("./AliasCommand");
const { splitArgs } = require("../../util/string");

class TreeCommand extends BaseCommand {
    constructor() {
        super();

        this.sub_commands = new Map;
    }

    async run(message, command_name, content, pass_through, timer) {
        const args = splitArgs(content, 2);

        if (this.sub_commands.size === 0) {
            throw new Error("No SubCommands registered");
        }

        let command = this.sub_commands.get(args[0]);
        let is_default = false;
        if (!command) {
            command = this.sub_commands.get("*");
            is_default = true;
        }
        if (!command)
            return; // Use SimpleTreeCommand then?

        if (!command.permissions.test(message.member || message.author)) {
            await command.noPermission(message);
            return;
        }
        if (command.rateLimiter && !command.rateLimiter.testAndAdd(message.author.id)) {
            await command.rateLimit(message);
            return;
        }

        command_name += (is_default ? "" : " " + args[0]);
        content = is_default ? content : args[1];
        await command.run(message, command_name, content, pass_through, timer);
    }

    registerSubCommand(id, command) {
        if (this.sub_commands.has(id)) throw new Error("Command name already exists");

        command.setPermissions(this.permissions);
        this.sub_commands.set(id, command);
        return command;
    }

    registerSubCommandAlias(command, alias) {
        if (!this.sub_commands.has(command)) throw new Error(command + " isn't in the command map...");
        if (this.sub_commands.has(alias)) throw new Error("Alias '" + alias + "' is already registered in the command map...");

        const cmd = this.sub_commands.get(command);
        cmd.aliases.push(alias);
        this.registerSubCommand(alias, new AliasCommand(command, cmd));
    }

    registerDefaultCommand(command) {
        // not a great solution
        // but the only thing that works
        if (typeof command.linkTo === "function") command.linkTo(this);
        command.setPermissions(this.permissions);
        this.registerSubCommand("*", command);
        return command;
    }

    setScope(v, recursive = false) {
        super.setScope(v, recursive);
        if (recursive) for (let [, cmd] of this.sub_commands) cmd.setScope(v, recursive);
        return this;
    }
}

module.exports = TreeCommand;
