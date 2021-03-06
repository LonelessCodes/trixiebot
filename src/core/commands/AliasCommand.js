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

const BaseCommand = require("./BaseCommand").default;

class AliasCommand extends BaseCommand {
    constructor(parentName, command) {
        super();

        this.parentName = parentName;
        this.command = command;
    }

    get parentCategory() {
        return this.command.category;
    }

    async run(ctx, command_name) {
        await this.command.run(ctx, command_name);
    }
}

module.exports = AliasCommand;
