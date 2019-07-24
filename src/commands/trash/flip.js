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

const fliptext = require("flip-text");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");
const CommandScope = require("../../util/commands/CommandScope");
const MessageMentions = require("../../util/commands/MessageMentions");

module.exports = function install(cr) {
    cr.registerCommand("flip", new SimpleCommand((message, content) => {
        const is_dm = message.channel.type === "dm";
        const mention = !is_dm ? new MessageMentions(content, message.guild).members.first() : undefined;
        if (!mention) {
            if (content === "") {
                return `Usage: \`${message.prefix}flip <${!is_dm ? "user|" : ""}string>\``;
            }
            return `(╯°□°）╯︵ ${fliptext(content)}`;
        }
        return `(╯°□°）╯︵ ${fliptext(mention.displayName)}`;
    }))
        .setHelp(new HelpContent()
            .setDescription("Aw heck I'm gonna flip you upside down!\nFlips a text or username upside down like a good boi")
            .setUsage("<user|string>")
            .addParameter("user|string", "user or text to flip"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);

    cr.registerCommand("unflip", new SimpleCommand((message, content) => {
        const is_dm = message.channel.type === "dm";
        const mention = !is_dm ? new MessageMentions(content, message.guild).members.first() : undefined;
        if (!mention) {
            if (content === "") {
                return `Usage: \`${message.prefix}unflip <${!is_dm ? "user|" : ""}string>\``;
            }
            return `${content} ノ( ゜-゜ノ)`;
        }
        return `${mention.displayName || mention.username} ノ( ゜-゜ノ)`;
    }))
        .setHelp(new HelpContent()
            .setDescription("Oh sorry didn't mean to. Lemme just...!\nUn-Flips a text or username like a real good boi who doesn't want you any trouble")
            .setUsage("<user|string>")
            .addParameter("user|string", "user or text to unflip"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);
};
