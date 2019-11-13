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
const HelpBuilder = require("../../util/commands/HelpBuilder");

class OverloadCommand extends BaseCommand {
    constructor() {
        super();

        /** @type {Map<string, BaseCommand>} */
        this.overloads = new Map;

        this._linked_to = this;
    }

    async run(context, command_name) {
        const args = context.content.split(/\s+/).filter(s => s !== "");

        if (this.overloads.size === 0) {
            throw new Error("No Overloads registered");
        }

        const command = this.getCmd(args);
        if (!command) {
            await HelpBuilder.sendHelp(context, command_name, this._linked_to || this);
            // maybe send a shorter version of the help
            return;
        }

        if (!command.permissions.test(context.member || context.author)) {
            await command.noPermission(context);
            return;
        }
        if (command.rateLimiter && !command.rateLimiter.testAndAdd(context.author.id)) {
            await command.rateLimit(context);
            return;
        }

        await command.run(context, command_name);
    }

    /**
     * @param {string[]} args
     * @returns {BaseCommand}
     */
    getCmd(args) {
        const size = args.length;
        for (let [num, cmd] of this.overloads) {
            for (let option of num.split(/, */).map(s => s.trim())) {
                if (/^[0-9]+\+$/.test(option)) {
                    const num = parseInt(option.slice(0, -1));
                    if (!Number.isNaN(num) && size >= num) return cmd;
                }
                const RANGE = option.split(/-/).slice(0, 2).map(s => parseInt(s));
                if (RANGE.length === 1) {
                    if (RANGE[0] === size) return cmd;
                } else if (RANGE.length === 2) {
                    if (size >= RANGE[0] && RANGE[1] >= size) return cmd;
                }
            }
        }
    }

    /**
     * Formatted as: 1,2,3 or 2-3, or 2+ or 1,3,5-6
     * @param {string} args
     * @param {BaseCommand} command
     * @returns {OverloadCommand}
     */
    registerOverload(args, command) {
        if (this.overloads.has(args)) throw new Error("Overload already exists");

        command.setPermissions(this.permissions);
        this.overloads.set(args, command);
        return this;
    }

    linkTo(command) {
        this._linked_to = command;
        return this;
    }

    setScope(v, recursive = false) {
        super.setScope(v, recursive);
        for (let [, cmd] of this.overloads) cmd.setScope(v, recursive);
        return this;
    }
}

module.exports = OverloadCommand;
