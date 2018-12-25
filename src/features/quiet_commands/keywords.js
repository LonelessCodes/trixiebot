const log = require("../../modules/log");
const secureRandom = require("../../modules/secureRandom");
const Discord = require("discord.js");

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

class Keyword {
    async run(message) {
        if (message.author.bot) return;
        
        await this.call(message);
    }
    async call() { }
}

const keywords = [];

module.exports = async function install(cr, client) {
    client.addListener("message", async message => {
        keywords.forEach(key => key.run(message));
    });

    keywords.push(new class extends Keyword {
        async call(message) {
            if (!/@someone\b/gi.test(message.content)) return;

            const array = message.guild.members.array();
            const member = await secureRandom(array);
            await message.channel.send(`${await secureRandom(emoticons)} ***(${member.displayName})***`);
            log(`Requested someone. Picked ${member.displayName}`);
        }
    });

    keywords.push(new class extends Keyword {
        async call(message) {
            if (!/lone pone\b/gi.test(message.content)) return;

            const attachment = new Discord.Attachment("https://cdn.discordapp.com/attachments/364776152176263171/519631563835572287/lone_sneak.png");

            await message.channel.send(attachment);
        }
    });
};