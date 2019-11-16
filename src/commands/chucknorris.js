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

const fetch = require("node-fetch");
const HTMLDecoderEncoder = require("html-encoder-decoder");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

module.exports = function install(cr) {
    cr.registerCommand("chucknorris", new SimpleCommand(async () => {
        /** @type {} */
        const request = await fetch("https://api.chucknorris.io/jokes/random");
        const magic = await request.json();
        if (!magic) {
            throw new Error("API fucked up");
        }

        return HTMLDecoderEncoder.decode(magic.value);
    }))
        .setHelp(new HelpContent()
            .setDescription("Chuck\nNorris\nFacts!!!"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);
};
