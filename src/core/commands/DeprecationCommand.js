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

// eslint-disable-next-line no-unused-vars
const BaseCommand = require("./BaseCommand").default;
const { Resolvable } = require("../../modules/i18n/Resolvable");

class DeprecationCommand extends BaseCommand {
    /**
     * @param {Resolvable<string>} desc
     * @param {BaseCommand} [cmd]
     */
    constructor(desc, cmd) {
        super();

        this.desc = desc;
        this.cmd = cmd;
    }

    async run(context, command_name) {
        await context.send(this.desc);
        if (this.cmd) await this.cmd.run(context, command_name);
    }
}

module.exports = DeprecationCommand;
