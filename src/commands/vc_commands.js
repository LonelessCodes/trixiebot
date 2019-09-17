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

const log = require("../log").namespace("vc cmds");
const AudioManager = require("../core/managers/AudioManager");
const { ConnectError } = AudioManager;

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");

const Translation = require("../modules/i18n/Translation");

module.exports = function install(cr) {
    cr.registerCommand("leavevc", new SimpleCommand(async ({ message, audio }) => {
        try {
            await audio.destroy();
            await message.react("👍");
        } catch (err) {
            await message.react("❌");
            log.namespace("leave", err);
            return new Translation("audio.error", "Some error happened and caused some whoopsies");
        }
    }))
        .setHelp(new HelpContent()
            .setDescription("Make Trixie leave the voice channel!"))
        .setCategory(Category.AUDIO);

    cr.registerAlias("leavevc", "leave");
    cr.registerAlias("leavevc", "begone");

    cr.registerCommand("stopvc", new SimpleCommand(async ({ message, audio }) => {
        try {
            audio.stop();
            await message.react("👍");
        } catch (err) {
            await message.react("❌");
            log.namespace("stop", err);
            return new Translation("audio.error", "Some error happened and caused some whoopsies");
        }
    }))
        .setHelp(new HelpContent()
            .setDescription("Stop whatever Trixie is saying in VC"))
        .setCategory(Category.AUDIO);

    cr.registerAlias("stopvc", "stop");

    cr.registerCommand("joinvc", new SimpleCommand(async ({ message, audio }) => {
        try {
            await audio.connect(message.member);
            await message.react("👍");
        } catch (err) {
            await message.react("❌");
            if (err instanceof ConnectError) {
                return err.message;
            }
            log.namespace("join", err);
            return new Translation("audio.error", "Some error happened and caused some whoopsies");
        }
    }))
        .setHelp(new HelpContent()
            .setDescription("Stop whatever Trixie is saying in VC"))
        .setCategory(Category.AUDIO);

    cr.registerAlias("joinvc", "join");
};
