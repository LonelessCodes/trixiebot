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

const { timeout } = require("../../util/promises");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const CommandScope = require("../../util/commands/CommandScope").default;
const Category = require("../../util/commands/Category").default;

module.exports = function install(cr) {
    // expand dong
    cr.registerCommand("expand", new TreeCommand)
        .dontList()
        .setScope(CommandScope.ALL)
        .setCategory(Category.FUN)
        .registerSubCommand("dong", new SimpleCommand(async message => {
            let progress = 3;
            const dick = await message.channel.send(`8${new Array(progress).fill("=").join("")}D`);
            while (progress++ < 30) {
                await timeout(1000); // can't go faster because of rate limits
                await dick.edit(`8${new Array(progress).fill("=").join("")}D`);
            }
        }));
};
