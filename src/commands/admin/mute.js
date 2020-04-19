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

const log = require("../../log").namespace("mute");
const nanoTimer = require("../../modules/timer");
const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const CommandScope = require("../../util/commands/CommandScope");
const Category = require("../../util/commands/Category");

const Translation = require("../../modules/i18n/Translation");
const TranslationMerge = require("../../modules/i18n/TranslationMerge");
const ListFormat = require("../../modules/i18n/ListFormat");

module.exports = function install(cr, { db }) {
    const database = db.collection("mute");

    const permission = new CommandPermission([Discord.Permissions.FLAGS.MANAGE_MESSAGES]);

    // TODO: fix performance issue
    // Even a minimally small collection of 50 documents takes
    // anywhere up to 80 seconds to get

    /** @type {Map<string, Set<string>>} */
    const muted_words = new Map;
    const timer = nanoTimer();
    database.find({}).stream()
        .on("data", ({ word, guildId }) => {
            if (muted_words.has(guildId)) muted_words.get(guildId).add(word);
            else muted_words.set(guildId, new Set([word]));
        })
        .once("end", () => log(`loaded all words. time:${nanoTimer.diffMs(timer)}ms`));

    cr.registerProcessedHandler(new CommandScope(CommandScope.FLAGS.GUILD), true, async ({ message, content }) => {
        if (!muted_words.has(message.guild.id)) return;

        const words = muted_words.get(message.guild.id);
        if (words.size > 0 && !permission.test(message.member)) {
            const msg = content.toLowerCase();
            for (const word of words) {
                if (msg.indexOf(word) === -1) continue;

                await message.delete().catch(() => { /* Do nothing */ });
            }
        }
    });

    const muteWordCommand = cr.registerCommand("muteword", new TreeCommand)
        .setHelp(new HelpContent()
            .setUsage("<phrase>", "Mute/Blacklist specific words in this server")
            .addParameter("phrase", "Word or phrase to be muted/blacklisted"))
        .setCategory(Category.MODERATION)
        .setPermissions(permission);

    const removeCommand = new OverloadCommand()
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const word = content.trim().toLowerCase();

            await database.deleteOne({ guildId: message.guild.id, word });
            const set = muted_words.get(message.guild.id);
            if (!set) return new Translation("mute.removed_not_found", "That word has not been muted");
            if (set.size <= 1) muted_words.delete(message.guild.id);
            else set.delete(word);

            return new Translation("mute.removed", "Removed muted word \"{{word}}\" successfully", { word });
        }))
        .setHelp(new HelpContent()
            .setUsage("<phrase>")
            .addParameter("phrase", "Word or phrase to be unmuted/unblacklisted"))
        .setCategory(Category.MODERATION)
        .setPermissions(permission);

    muteWordCommand.registerSubCommand("remove", removeCommand);
    cr.registerCommand("unmute", removeCommand);

    muteWordCommand.registerSubCommand("clear", new SimpleCommand(async message => {
        await database.deleteMany({ guildId: message.guild.id });
        muted_words.delete(message.guild.id);

        return new Translation("mute.cleared_all", "Removed all muted words successfully");
    }))
        .setHelp(new HelpContent().setUsage("", "Remove all muted words"));

    muteWordCommand.registerSubCommand("list", new SimpleCommand(message => {
        if (muted_words.has(message.guild.id) && muted_words.get(message.guild.id).size > 0) {
            return new TranslationMerge(
                new Translation("mute.currently", "Currently muted are:"), "\n",
                new ListFormat([...muted_words.get(message.guild.id)].map(w => `\`${w}\``))
            );
        } else {
            return new Translation("mute.nothing_muted", "Nothing yet muted");
        }
    }))
        .setHelp(new HelpContent().setUsage("", "list all muted words and phrases"));

    muteWordCommand.registerDefaultCommand(new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const word = content.trim().toLowerCase();

            if (muted_words.has(message.guild.id) && muted_words.get(message.guild.id).has(word)) {
                return new Translation("mute.exists", "Already got this muted");
            }

            await database.insertOne({ guildId: message.guild.id, word });
            if (muted_words.has(message.guild.id)) muted_words.get(message.guild.id).add(word);
            else muted_words.set(message.guild.id, new Set([word]));

            return new Translation("mute.success", "Got it! Blacklisted use of \"{{word}}\"", { word });
        }));

    muteWordCommand.registerSubCommandAlias("*", "add");
};
