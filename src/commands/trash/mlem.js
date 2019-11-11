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

const { userToString } = require("../../util/util");
const CONST = require("../../const");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");
const CommandScope = require("../../util/commands/CommandScope");

const Translation = require("../../modules/i18n/Translation");
const TranslationEmbed = require("../../modules/i18n/TranslationEmbed");

module.exports = function install(cr) {
    cr.registerCommand("mlem", new SimpleCommand(message =>
        new TranslationEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setTitle("MLEM o3o")
            .setImage("https://derpicdn.net/img/view/2017/11/7/1580177.gif")
            .setFooter(new Translation("mlem", "The chat got mlem'd by {{user}} | Art by n0nnny", {
                user: userToString(message.author, true),
            }))
    ))
        .setHelp(new HelpContent().setDescription("Mlem the chat :3"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);

    cr.registerCommand("blep", new SimpleCommand(message =>
        new TranslationEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setTitle("BLEP o3o")
            .setImage("https://derpicdn.net/img/view/2017/11/7/1580178.gif")
            .setFooter(new Translation("blep", "The chat got blep'd by {{user}} | Art by n0nnny", {
                user: userToString(message.author, true),
            }))
    ))
        .setHelp(new HelpContent().setDescription("Blep the chat :3"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);
};
