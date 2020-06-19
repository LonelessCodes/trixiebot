/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

import BaseCommand from "./commands/BaseCommand";
import AliasCommand from "./commands/AliasCommand";
import CCManager from "./managers/CCManager";
import CommandScope from "../util/commands/CommandScope";
import MessageContext from "../util/commands/MessageContext";
import Category from "../util/commands/Category";

import Discord from "discord.js";
import mongo from "mongodb";

export default class CommandRegistry {
    public CC: CCManager;

    public commands: Map<string, BaseCommand>;
    public keywords: Map<RegExp, BaseCommand>;
    public processed_handlers: { scope: CommandScope; priority: boolean; handler(context: MessageContext): Promise<void> }[];

    constructor(client: Discord.Client, database: mongo.Db) {
        this.CC = new CCManager(client, database);

        /** @type {Map<string, BaseCommand>} */
        this.commands = new Map();
        /** @type {Map<RegExp, BaseCommand>} */
        this.keywords = new Map();
        /** @type {Array<{ scope: CommandScope; priority: boolean; handler: (context: MessageContext) => Promise<void> }>} */
        this.processed_handlers = [];
    }

    getCommand(message: Discord.Message, prefix_used: boolean, command_name: string): { type: number; trigger: string | RegExp; command: BaseCommand; } | undefined {
        if (prefix_used) {
            const command = this.commands.get(command_name);
            if (command)
                return {
                    type: CommandRegistry.TYPE.COMMAND,
                    trigger: command_name,
                    command: command,
                    ...CommandRegistry.resolveCommand(command_name, command),
                };
        }

        for (const [regex, command] of this.keywords) {
            // There appears to be a bug where "@someone" is only a match
            // every second time. Setting lastIndex to 0 before a test solves that
            regex.lastIndex = 0;

            if (regex.test(message.content))
                return {
                    type: CommandRegistry.TYPE.KEYWORD,
                    trigger: regex,
                    command: command,
                    ...CommandRegistry.resolveCommand(regex, command),
                };
        }
    }

    /*
     * Classical Commands
     */

    registerCommand<T extends BaseCommand>(id: string, command: T): T {
        if (this.commands.has(id)) throw new Error("Command name already exists");

        this.commands.set(id, command);
        return command;
    }

    registerAlias(command: string, ...aliases: string[]): void {
        for (const alias of aliases) if (this.commands.has(alias)) throw new Error("Alias '" + alias + "' is already registered in the command map...");

        const cmd = this.commands.get(command);
        if (!cmd) throw new Error(command + " isn't in the command map...");

        cmd.aliases.push(...aliases);
        for (const alias of aliases) this.registerCommand(alias, new AliasCommand(command, cmd));
    }

    // TODO: remove aliases on Command classes!!!
    /**
     * Unsused function until I finally manage to seperate aliases from the BaseCommand objects
     * in an attempt to finally make Commands fully pluggable and reusable
     * @param {string} command_name
     * @returns {string[]}
     */
    getAliasesFor(command_name: string): string[] {
        const aliases: string[] = [];
        for (const [name, command] of this.commands) {
            if (command instanceof AliasCommand && command.parentName === command_name) aliases.push(name);
        }
        return aliases;
    }

    /*
     * Keyword Commands
     */

    registerKeyword<T extends BaseCommand>(match: RegExp, command: T): T {
        if (this.keywords.has(match)) throw new Error("Keyword name already exists");

        command.setCategory(Category.KEYWORD);
        this.keywords.set(match, command);
        return command;
    }

    /*
     * Message Processed Handlers
     */

    registerProcessedHandler(scope: CommandScope, priority: boolean, handler: (context: MessageContext) => Promise<void>): void {
        this.processed_handlers.push({ scope, priority, handler });
    }

    static resolveCommand(trigger: RegExp | string, command: BaseCommand): { trigger: RegExp | string; command: BaseCommand; } {
        while (command instanceof AliasCommand) {
            trigger = command.parentName;
            command = command.command;
        }

        return { trigger, command };
    }

    static TYPE = Object.freeze({
        COMMAND: 0,
        KEYWORD: 1,
    });
}
