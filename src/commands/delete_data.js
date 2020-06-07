/*
 * Copyright (C) 2020 Christian Schäfer / Loneless
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

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;

const Translation = require("../modules/i18n/Translation").default;

module.exports = function install(cr, { db }) {
    cr.registerCommand(
        "deletedata",
        new SimpleCommand(async message => {
            await message.send(new Translation("delete_data.warning", "❗❗❗ This will delete all personal data Trixie holds that is connected to your account.\n**B E W A R E**: This will reset all your slots, your birthday, your user stats, unsubscribe you from the newsletter, reset all your waifus, reset your credits to 0 and wipe all transactions, resets your whole soundboard and removes those samples from other users soundboards, if they imported them and finally, deletes your penis settings ❗❗❗\n\nDo you want to proceed? (yes/no)."));

            const messages = await message.channel.awaitMessages(m => m.author.id === message.author.id && /yes|no/.test(m.content), { max: 1, time: 60000 });

            const m = messages.first();

            if (!m) return new Translation("delete_data.timeout", "Data deletion has been aborted due to inactivity.");

            if (m.content === "no") return new Translation("delete_data.no", "Data deletion has been aborted. You're fine.");

            await db.deleteUserData(message.author);

            return new Translation("delete_data.success", "All of your personal data has been purged successfully 🎉");
        })
    )
        .setHelp(new HelpContent()
            .setDescription("This deletes all personal data Trixie holds that is connected to your account.\n**B E W A R E**: This will reset all your slots, your birthday, your user stats, unsubscribe you from the newsletter, reset all your waifus, reset your credits to 0 and wipe all transactions, resets your whole soundboard and removes those samples from other users soundboards, if they imported them and finally, deletes your penis settings.")
            .setUsage("", "Delete all personal data Trixie holds of you."))
        .setCategory(Category.TRIXIE);
};
