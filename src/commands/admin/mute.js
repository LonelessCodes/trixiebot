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

const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const Category = require("../../util/commands/Category");

const Translation = require("../../modules/i18n/Translation");
const TranslationMerge = require("../../modules/i18n/TranslationMerge");

module.exports = function install(cr, { db }) {
    const database = db.collection("mute");

    const permission = new CommandPermission([Discord.Permissions.FLAGS.MANAGE_MESSAGES]);

    const muteWordCommand = cr.registerCommand("muteword", new class extends TreeCommand {
        /**
         * TODO: CACHE DATABASE STUFF
         */

        async beforeProcessCall({ message, content }) {
            const muted_words = (await database.find({ guildId: message.guild.id }).toArray()).map(doc => doc.word);

            if (muted_words.length > 0 && !permission.test(message.member)) {
                const msg = content.toLowerCase();
                for (const word of muted_words) {
                    if (msg.indexOf(word) === -1) continue;

                    await message.delete().catch(() => { /* Do nothing */ });
                }
            }

            return muted_words;
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<phrase>", "Mute/Blacklist specific words in this server")
            .addParameter("phrase", "Word or phrase to be muted/blacklisted"))
        .setCategory(Category.MODERATION)
        .setPermissions(permission)
        .setIgnore(false);

    const removeCommand = new OverloadCommand()
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const word = content.trim().toLowerCase();

            await database.deleteOne({ guildId: message.guild.id, word });

            return new Translation("mute.removed", "Removed muted word \"{{word}}\" successfully", { word });
        }))
        .setHelp(new HelpContent()
            .setUsage("<phrase>")
            .addParameter("phrase", "Word or phrase to be unmuted/unblacklisted"));

    muteWordCommand.registerSubCommand("remove", removeCommand);
    cr.registerCommand("unmute", removeCommand);

    muteWordCommand.registerSubCommand("clear", new SimpleCommand(async message => {
        await database.deleteMany({ guildId: message.guild.id });

        return new Translation("mute.cleared_all", "Removed all muted words successfully");
    }))
        .setHelp(new HelpContent().setUsage("", "Remove all muted words"));

    muteWordCommand.registerSubCommand("list", new SimpleCommand((message, { pass_through: muted_words }) => {
        if (muted_words.length > 0) {
            return new TranslationMerge(new Translation("mute.currently", "Currently muted are:"), "\n", "`" + muted_words.join("`, `") + "`");
        } else {
            return new Translation("mute.nothing_muted", "Nothing yet muted");
        }
    }))
        .setHelp(new HelpContent().setUsage("", "list all muted words and phrases"));

    muteWordCommand.registerDefaultCommand(new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }, { pass_through: muted_words = [] }) => {
            /**
             * @type {string}
             */
            const word = content.trim().toLowerCase();

            if (muted_words.includes(word)) {
                return new Translation("mute.exists", "Already got this muted");
            }

            await database.insertOne({ guildId: message.guild.id, word });

            return new Translation("mute.success", "Got it! Blacklisted use of \"{{word}}\"", { word });
        }));

    muteWordCommand.registerSubCommandAlias("*", "add");
};
