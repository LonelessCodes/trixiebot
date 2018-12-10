const log = require("../../modules/log");
const secureRandom = require("../../modules/secureRandom");

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
    async call() { }
}

const keywords = [];

module.exports = async function install(cr, client) {
    client.addListener("message", async message => {
        keywords.forEach(key => key.call(message));
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

            await message.channel.send("https://cdn.discordapp.com/attachments/364776152176263171/519631563835572287/lone_sneak.png");
        }
    });
};