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
const CommandScope = require("../../util/commands/CommandScope");

class ScopedCommand extends BaseCommand {
    constructor(permissions) {
        super(permissions);

        /** @type {BaseCommand[]} */
        this.scopes = [];
    }

    async run(context, command_name, pass_through) {
        if (this.scopes.length === 0) {
            throw new Error("No Scopes registered");
        }

        const command = this.getCmd(context.channel);
        if (!command) return;

        if (!command.permissions.test(context.member || context.author)) {
            await command.noPermission(context);
            return;
        }
        if (command.rateLimiter && !command.rateLimiter.testAndAdd(context.author.id)) {
            await command.rateLimit(context);
            return;
        }

        await command.run(context, command_name, pass_through);
    }

    getCmd(channel) {
        for (let command of this.scopes) {
            if (command.hasScope(channel)) return command;
        }
    }

    /**
     * Data that can be resolved to give a bitfield. This can be:
     * * A string (see {@link BitField.FLAGS})
     * * A bit number
     * * An instance of BitField
     * * An Array of BitFieldResolvable
     * @typedef {string|number|CommandScope|BitFieldResolvable[]} BitFieldResolvable
     */

    /**
     * @param {BitFieldResolvable} scope
     * @param {BaseCommand} command
     * @returns {ScopedCommand}
     */
    registerScope(scope, command) {
        command = command.setScope(scope);
        const scopes = command.scope.toArray();
        for (let s of this.scopes) {
            for (let v of scopes) {
                if (s.scope.has(CommandScope.FLAGS[v])) throw new Error("Scope already registered");
            }
        }

        this.scopes.push(command);

        return this;
    }
}

module.exports = ScopedCommand;
