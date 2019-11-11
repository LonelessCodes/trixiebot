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

const CommandPermission = require("./CommandPermission");
const HelpBuilder = require("./HelpBuilder");
const { format } = require("../string");

function helpToJSON(config, name, command) {
    const prefix = config.prefix;

    const json = {};
    if (command.explicit) json.explicit = true;
    if (command.help.description) json.description = command.help.description;
    if (command.permissions && command.permissions !== CommandPermission.USER)
        json.permissions = command.permissions.toString();
    if (command.rateLimiter)
        json.rateLimiter = command.rateLimiter.toString();

    const fields = HelpBuilder.generateUsage(prefix, { type: "text", nsfw: false }, name, command);

    let str = "";
    for (let { title, usage } of fields) {
        if (usage !== "")
            str += (title ? "**" + title + "**" : "") + "\n" + format(usage, { prefix });
    }

    json.usage = str;

    if (command.category) json.category = command.category.toString();

    return json;
}

module.exports = helpToJSON;
