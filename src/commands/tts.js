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
const config = require("../config");
const fetch = require("node-fetch");
const AudioManager = require("../core/managers/AudioManager");
const { ConnectError } = AudioManager;

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");

module.exports = function install(cr) {
    if (!config.has("voicerss.key")) return log.namespace("config", "Found no API token for voicerss - Disabled tts command");

    const logtts = log.namespace("tts cmd");

    cr.registerCommand("tts", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            if (!/[a-z0-9]/.test(content)) {
                message.react("❌");
                message.channel.sendTranslated("Ehhh rather send a normal message. This kind of message is know to kinda break me");
                return;
            }

            const audio = AudioManager.getGuild(message.guild);

            if (audio.playing) {
                message.react("❌");
                message.channel.sendTranslated("Something is already playing, don't wanna interrupt!");
                return;
            }

            if (content.length > 90000) {
                message.react("❌");
                message.channel.sendTranslated("I'm sorry to disappoint you, but I may only use up to 100000 character :/");
                return;
            }

            try {
                const url = `https://api.voicerss.org/?key=${config.get("voicerss.key")}&hl=en-US&f=48khz_16bit_mono&c=ogg&src=${encodeURIComponent(content)}`;

                const connection = await audio.connect(message.member);
                const request = await fetch(url);
                if (!request.ok) throw new ConnectError("HTTP Request Error");

                const stream = request.body;

                const dispatcher = connection.playStream(stream);
                dispatcher.once("start", () => {
                    connection.player.streamingData.pausedTime = 0;
                });
                stream.once("end", () => connection.setSpeaking(false));
                stream.once("error", () => connection.setSpeaking(false));

                await message.react("👍");
            } catch (err) {
                await message.react("❌");
                if (err instanceof ConnectError) {
                    message.channel.sendTranslated(err.message);
                    return;
                }
                logtts.error(err);
                message.channel.sendTranslated("Some error happened and caused some whoopsies");
            }
        }))
        .setHelp(new HelpContent()
            .setDescription("Make Trixie join the user's current voice channel and read the `message` out aloud.")
            .setUsage("<message>")
            .addParameter("message", "The message to be read out by Trixie"))
        .setCategory(Category.AUDIO);
};
