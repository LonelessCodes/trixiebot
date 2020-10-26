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

const secureRandom = require("../../modules/random/secureRandom").default;
const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");

const emoticons = [
    "¯(°_o)/¯",
    "(∩ ͡° ͜ʖ ͡°)⊃━☆ﾟ. o ･ ｡ﾟ",
    "ಠ_ಠ",
    "ヽ༼ ಠ益ಠ ༽ﾉ",
    "¯\\_(ツ)_/¯",
    "（✿ ͡◕ ᴗ◕)つ━━✫・o。",
    "(◕‿◕✿)",
    "(╯°□°）╯︵ ┻━┻",
    "༼ つ ◕_◕ ༽つ",
    "(⁄ ⁄•⁄ω⁄•⁄ ⁄)",
];

module.exports = function install(cr) {
    cr.registerKeyword(/@someone\b/gi, new SimpleCommand(async message => {
        const array = message.guild.members.cache.array();
        const member = await secureRandom(array);
        await message.channel.send(`${await secureRandom(emoticons)} ***(${member.displayName})***`);
    }));

    // cr.registerKeyword(/lone pone\b/gi, new SimpleCommand(async message => {
    //     const attachment = new Discord.MessageAttachment("https://cdn.discordapp.com/attachments/364776152176263171/519631563835572287/lone_sneak.png");

    //     await message.channel.send(attachment);
    // }));
};
