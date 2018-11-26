const log = require("../../modules/log");

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
        const member = array[Math.floor(Math.random() * array.length)];
        await message.channel.send(`${emoticons[Math.floor(Math.random() * emoticons.length)]} ***(${member.displayName})***`);
        log(`Requested someone. Picked ${member.displayName}`);
    });
};