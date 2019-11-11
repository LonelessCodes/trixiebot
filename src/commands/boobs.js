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
const CONST = require("../const");
const Discord = require("discord.js");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

async function randomBoob(reconnectTries = 0) {
    let file;
    try {
        const response = await fetch("http://api.oboobs.ru/boobs/0/1/random");
        const result = await response.json();
        file = "http://media.oboobs.ru/" + result[0].preview.replace("_preview", "");
    } catch (err) {
        reconnectTries++;
        if (reconnectTries > 5) throw err;
        file = await randomBoob(reconnectTries);
    }

    return file;
}

module.exports = function install(cr) {
    cr.registerCommand("boobs", new SimpleCommand(async () => {
        const url = await randomBoob();
        return new Discord.RichEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setImage(url);
    }))
        .setHelp(new HelpContent().setUsage("", "I wonder what this does"))
        .setExplicit(true)
        .setCategory(Category.IMAGE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("boobs", "boobies");
    cr.registerAlias("boobs", "bewbs");
};
