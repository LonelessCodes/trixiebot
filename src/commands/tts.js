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

const log = require("../log");
const logtts = log.namespace("tts cmd");
const config = require("../config");
const fetch = require("node-fetch");
const AudioManager = require("../core/managers/AudioManager");
const { ConnectError } = AudioManager;

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");

const Translation = require("../modules/i18n/Translation");

module.exports = function install(cr) {
    if (!config.has("voicerss.key")) return log.namespace("config", "Found no API token for voicerss - Disabled tts command");

    cr.registerCommand("tts", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content, ctx }) => {
            if (!/[a-z0-9]/.test(content)) {
                message.react("❌");
                return new Translation(
                    "tts.invalid_msg", "Ehhh rather send a normal message. This kind of message is know to kinda break me"
                );
            }

            // request getter value from MessageContext#audio after check
            const audio = ctx.audio;

            if (audio.playing) {
                message.react("❌");
                return new Translation("audio.already_playing", "Something is already playing, don't wanna interrupt!");
            }

            // actually can't ever reach that
            if (content.length > 90000) {
                message.react("❌");
                return new Translation("tts.too_long", "I'm sorry to disappoint you, but I may only use up to 100000 character :/");
            }

            try {
                const url = `https://api.voicerss.org/?key=${config.get("voicerss.key")}&hl=en-US&f=48khz_16bit_mono&c=ogg&src=${encodeURIComponent(content)}`;

                const connection = await audio.connect(message.member);
                const request = await fetch(url);
                if (!request.ok) throw new ConnectError("HTTP Request Error");

                const stream = request.body;

                const dispatcher = connection.play(stream, { volume: false });
                dispatcher.once("start", () => {
                    connection.player.streamingData.pausedTime = 0;
                });
                dispatcher.once("finish", () => connection.setSpeaking(0));
                dispatcher.once("error", () => connection.setSpeaking(0));
                stream.once("error", () => connection.setSpeaking(0));

                await message.react("👍");
            } catch (err) {
                await message.react("❌");
                if (err instanceof ConnectError) {
                    return err.message;
                }
                logtts.error(err);
                return new Translation("audio.error", "Some error happened and caused some whoopsies");
            }
        }))
        .setHelp(new HelpContent()
            .setDescription("Make Trixie join the user's current voice channel and read the `message` out aloud.")
            .setUsage("<message>")
            .addParameter("message", "The message to be read out by Trixie"))
        .setCategory(Category.AUDIO);
};
