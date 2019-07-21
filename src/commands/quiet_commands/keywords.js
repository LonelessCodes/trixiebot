const secureRandom = require("../../modules/random/secureRandom");
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
    "(⁄ ⁄•⁄ω⁄•⁄ ⁄)"
];

module.exports = async function install(cr) {
    cr.registerKeyword(/@someone\b/gi, new SimpleCommand(async message => {
        const array = message.guild.members.array();
        const member = await secureRandom(array);
        await message.channel.send(`${await secureRandom(emoticons)} ***(${member.displayName})***`);
    }));

    cr.registerKeyword(/lone pone\b/gi, new SimpleCommand(async message => {
        const attachment = new Discord.Attachment("https://cdn.discordapp.com/attachments/364776152176263171/519631563835572287/lone_sneak.png");

        await message.channel.send(attachment);
    }));
};