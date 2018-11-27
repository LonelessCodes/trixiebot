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

module.exports = async function install(cr, client) {
    client.addListener("message", async message => {
        if (!/@someone\b/i.test(message.content)) return;

        const array = message.guild.members.array();
        const member = await secureRandom(array);
        await message.channel.send(`${await secureRandom(emoticons)} ***(${member.displayName})***`);
        log(`Requested someone. Picked ${member.displayName}`);
    });
};