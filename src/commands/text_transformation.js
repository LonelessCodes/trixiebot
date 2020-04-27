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

const tinytext = require("tiny-text");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const CommandScope = require("../util/commands/CommandScope").default;

module.exports = function install(cr) {
    cr.registerCommand("smol", new OverloadCommand())
        .registerOverload(
            "1+",
            new SimpleCommand(({ message, content, ctx }) => {
                const mention = message.channel.type === "text" && ctx.mentions.members.first();
                if (!mention) {
                    const text = content.replace(/[^\S\x0a\x0d]+/g, " ");
                    return tinytext(text);
                }
                return tinytext(mention.displayName);
            })
        )
        .setHelp(
            new HelpContent()
                .setUsage("<string|user>", "Make teeeeny tiny text")
                .addParameter("string|user", "text or user to smollerize uwu")
        )
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);
    cr.registerAlias("smol", "small");
};
