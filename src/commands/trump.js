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

const { userToString } = require("../util/util");
const fetch = require("node-fetch");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

module.exports = function install(cr) {
    cr.registerCommand("trump", new SimpleCommand(async ({ message, ctx }) => {
        if (message.channel.type === "text") {
            const mentions = ctx.mentions;
            if (mentions.members.size > 0) {
                const member = mentions.members.first();

                const request = await fetch("https://api.whatdoestrumpthink.com/api/v1/quotes/personalized?q=" + encodeURIComponent(userToString(member)));
                const magic = await request.json();
                if (!magic) {
                    throw new Error("API fucked up");
                }

                return magic.message;
            }
        }

        const request = await fetch("https://api.whatdoestrumpthink.com/api/v1/quotes/random");
        const magic = await request.json();
        if (!magic) {
            throw new Error("API fucked up");
        }

        return magic.message;
    }))
        .setHelp(new HelpContent()
            .setDescription("What would Trump say?\nGets a random Trump quote")
            .setUsage("<?@mention>")
            .addParameterOptional("@mention", "If mentioned a user, command will return a personalized quote"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);
};
