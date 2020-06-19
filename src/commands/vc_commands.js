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

const { AudioConnectError } = require("../core/managers/AudioManager");
const log = require("../log").default.namespace("vc cmds");
const { doNothing } = require("../util/util");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;

const Translation = require("../modules/i18n/Translation").default;

module.exports = function install(cr) {
    cr.registerCommand(
        "leavevc",
        new SimpleCommand(async ({ message, audio }) => {
            audio.leave();
            await message.react("👍").catch(doNothing);
        })
    )
        .setHelp(new HelpContent().setUsage("", "Make Trixie leave the voice channel!"))
        .setCategory(Category.AUDIO);

    cr.registerAlias("leavevc", "leave", "begone");

    cr.registerCommand(
        "stopvc",
        new SimpleCommand(async ({ message, audio }) => {
            audio.stop();
            await message.react("👍").catch(doNothing);
        })
    )
        .setHelp(new HelpContent().setUsage("", "Stop whatever Trixie is saying in VC"))
        .setCategory(Category.AUDIO);

    cr.registerAlias("stopvc", "stop");

    cr.registerCommand(
        "joinvc",
        new SimpleCommand(async ({ message, audio }) => {
            try {
                await audio.connect(message.member);
                await message.react("👍").catch(doNothing);
            } catch (err) {
                await message.react("❌");
                if (err instanceof AudioConnectError) {
                    return err.message;
                }
                log.namespace("join", err);
                return new Translation("audio.error", "Some error happened and caused some whoopsies");
            }
        })
    )
        .setHelp(new HelpContent().setUsage("", "Stop whatever Trixie is saying in VC"))
        .setCategory(Category.AUDIO);

    cr.registerAlias("joinvc", "join");
};
