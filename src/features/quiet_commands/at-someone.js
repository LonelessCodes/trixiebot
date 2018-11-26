const log = require("../../modules/log");
const secureRandom = require("random-number-csprng");

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
        const member = array[await secureRandom(0, array.length - 1)];
        await message.channel.send(`${emoticons[await secureRandom(0, emoticons.length - 1)]} ***(${member.displayName})***`);
        log(`Requested someone. Picked ${member.displayName}`);
    });
};