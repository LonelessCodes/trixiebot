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

const TextCommand = require("../../core/commands/TextCommand");
const HelpContent = require("../../util/commands/HelpContent").default;
const Category = require("../../util/commands/Category").default;
const CommandScope = require("../../util/commands/CommandScope").default;

module.exports = function install(cr) {
    const url = "https://cdn.discordapp.com/attachments/397369538196406275/399707043281502208/C2OMrf3UcAARAGc.png";
    cr.registerCommand("larson", new TextCommand(url))
        .setHelp(new HelpContent().setUsage("", "well... yeah"))
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
};
