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

// eslint-disable-next-line no-unused-vars
const BaseCommand = require("./commands/BaseCommand").default;
const AliasCommand = require("./commands/AliasCommand");
const CCManager = require("./managers/CCManager");
// eslint-disable-next-line no-unused-vars
const CommandScope = require("../util/commands/CommandScope").default;
// eslint-disable-next-line no-unused-vars
const MessageContext = require("../util/commands/MessageContext").default;
const Category = require("../util/commands/Category").default;

class CommandRegistry {
    constructor(client, database) {
        this.CC = new CCManager(client, database);

        /** @type {Map<string, BaseCommand>} */
        this.commands = new Map();
        /** @type {Map<RegExp, BaseCommand>} */
        this.keywords = new Map();
        /** @type {Array<{ scope: CommandScope; priority: boolean; handler: (context: MessageContext) => Promise<void> }>} */
        this.processed_handlers = [];
    }

    /*
     * Classical Commands
     */

    /**
     * @param {string} id
     * @param {BaseCommand} command
     * @returns {BaseCommand}
     */
    registerCommand(id, command) {
        if (this.commands.has(id)) throw new Error("Command name already exists");

        this.commands.set(id, command);
        return command;
    }

    /**
     * @param {string} command
     * @param {string} alias
     */
    registerAlias(command, alias) {
        if (!this.commands.has(command)) throw new Error(command + " isn't in the command map...");
        if (this.commands.has(alias)) throw new Error("Alias '" + alias + "' is already registered in the command map...");

        const cmd = this.commands.get(command);
        cmd.aliases.push(alias);
        this.registerCommand(alias, new AliasCommand(command, cmd));
    }

    /**
     * Unsused function until I finally manage to seperate aliases from the BaseCommand objects
     * in an attempt to finally make Commands fully pluggable and reusable
     * @param {string|BaseCommand} command_name
     * @returns {string[]}
     */
    getAliasesFor(command_name) {
        const aliases = [];
        if (typeof command_name === "string") {
            for (let [name, command] of this.commands) {
                if (command instanceof AliasCommand && command.parentName === command_name) aliases.push(name);
            }
        } else if (command_name instanceof BaseCommand) {
            for (let [name, command] of this.commands) {
                if (command instanceof AliasCommand && command.command === command_name) aliases.push(name);
            }
        }
        return aliases;
    }

    /*
     * Keyword Commands
     */

    /**
     * @param {RegExp} match
     * @param {BaseCommand} command
     * @returns {BaseCommand}
     */
    registerKeyword(match, command) {
        if (this.keywords.has(match)) throw new Error("Keyword name already exists");

        command.setCategory(Category.KEYWORD);
        this.keywords.set(match, command);
        return command;
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {Message} message
     * @param {boolean} prefix_used
     * @param {string} command_name
     * @returns {{ type: number; trigger: string | RegExp; command: BaseCommand; } | undefined}
     */
    getCommand(message, prefix_used, command_name) {
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
     * Message Processed Handlers
     */

    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {CommandScope} scope
     * @param {boolean} priority
     * @param {(context: MessageContext) => Promise<void>} handler
     */
    registerProcessedHandler(scope, priority, handler) {
        this.processed_handlers.push({ scope, priority, handler });
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {RegExp|string} trigger
     * @param {BaseCommand} command
     * @returns {{ trigger: RegExp|string, command: BaseCommand }}
     */
    static resolveCommand(trigger, command) {
        while (command instanceof AliasCommand) {
            trigger = command.parentName;
            command = command.command;
        }

        return { trigger, command };
    }
}
CommandRegistry.TYPE = Object.freeze({
    COMMAND: 0,
    KEYWORD: 1,
});

module.exports = CommandRegistry;
