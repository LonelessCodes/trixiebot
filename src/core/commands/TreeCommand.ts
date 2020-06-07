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

import BaseCommand from "./BaseCommand";
import AliasCommand from "./AliasCommand";
import { splitArgs } from "../../util/string";
import MessageContext from "../../util/commands/MessageContext";
import { BitFieldResolvable } from "discord.js";

export default class TreeCommand extends BaseCommand {
    sub_commands: Map<string, BaseCommand> = new Map();

    async run(context: MessageContext, command_name: string | RegExp): Promise<void> {
        const args = splitArgs(context.content, 2);

        if (this.sub_commands.size === 0) {
            throw new Error("No SubCommands registered");
        }

        let command = this.sub_commands.get(args[0]);
        let is_default = false;
        if (!command) {
            command = this.sub_commands.get("*");
            is_default = true;
        }
        if (!command) return;

        if (!command.permissions.test(context.member || context.author)) {
            await command.noPermission(context);
            return;
        }
        if (command.rateLimiter && !command.rateLimiter.testAndAdd(context.author.id)) {
            await command.rateLimit(context);
            return;
        }

        command_name += is_default ? "" : (" " + args[0]);
        context.content = is_default ? context.content : args[1];
        await command.run(context, command_name);
    }

    registerSubCommand<T extends BaseCommand>(id: string, command: T): T {
        if (this.sub_commands.has(id)) throw new Error("Command name already exists");

        command.setPermissions(this.permissions);
        this.sub_commands.set(id, command);
        return command;
    }

    registerSubCommandAlias(command: string, alias: string): void {
        if (this.sub_commands.has(alias)) throw new Error("Alias '" + alias + "' is already registered in the command map...");

        const cmd = this.sub_commands.get(command);
        if (!cmd) throw new Error(command + " isn't in the command map...");

        cmd.aliases.push(alias);
        this.registerSubCommand(alias, new AliasCommand(command, cmd));
    }

    registerDefaultCommand<T extends BaseCommand>(command: T): T {
        // not a great solution
        // but the only thing that works
        if (typeof command.linkTo === "function") command.linkTo(this);
        command.setPermissions(this.permissions);
        this.registerSubCommand("*", command);
        return command;
    }

    getAliasesFor(command_name: string): string[] {
        const aliases: string[] = [];
        for (const [name, command] of this.sub_commands) {
            if (command instanceof AliasCommand && command.parentName === command_name) aliases.push(name);
        }
        return aliases;
    }

    setScope(v: BitFieldResolvable<"GUILD" | "DM">, recursive = false): this {
        super.setScope(v);
        if (recursive) for (const [, cmd] of this.sub_commands) (cmd as BaseCommand | TreeCommand).setScope(v, recursive);
        return this;
    }
}
