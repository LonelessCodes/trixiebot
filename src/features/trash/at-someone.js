const log = require("../../modules/log");
const BaseCommand = require("../../class/BaseCommand");

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

class AtSomeoneCommand extends BaseCommand {
    async onbeforemessage(message) {
        if (!/@someone\b/i.test(message.content)) return;

        const array = message.guild.members.array();
        const member = array[Math.floor(Math.random() * array.length)];
        await message.channel.send(`${emoticons[Math.floor(Math.random() * emoticons.length)]} ***(${member.displayName})***`);
        log(`Requested someone. Picked ${member.displayName}`);
    }

    get guildOnly() { return true; }
}

module.exports = AtSomeoneCommand;
