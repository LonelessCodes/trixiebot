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

// eslint-disable-next-line no-unused-vars
const CommandPermission = require("../../util/commands/CommandPermission");
// eslint-disable-next-line no-unused-vars
const { Message } = require("discord.js");
// eslint-disable-next-line no-unused-vars
const { NanoTimer } = require("../../modules/NanoTimer");

class SimpleCommand extends BaseCommand {
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {(message: Message, content: string, add: { pass_through: any, command_name: string, timer: NanoTimer }) => *} func
     * @param {CommandPermission} permissions
     */
    constructor(func = async () => { /* Do nothing */ }, permissions) {
        super(permissions);

        this.func = func;
    }

    async run(message, command_name, content, pass_through, timer) {
        const result = await this.func(message, content, { pass_through, command_name, timer });
        if (!result) return;

        await message.channel.send(result);
    }
}

module.exports = SimpleCommand;
