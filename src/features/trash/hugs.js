const log = require("../../modules/log");
const Command = require("../../class/Command");

const hugs = [
    "(っ´▽｀)っ{{name}}",
    "(っ´▽｀)っ{{name}}",
    "(つˆ⌣ˆ)つ{{name}}",
    "(つˆ⌣ˆ)つ{{name}}",
    "╰(´︶`)╯{{name}}",
    "(⊃｡•́‿•̀｡)⊃{{name}}",
    "(づ｡◕‿‿◕｡)づ{{name}}",
    "(つ≧▽≦)つ{{name}}",
    "(つ≧▽≦)つ{{name}}",
    "(づ￣ ³￣)づ{{name}} ⊂(´・ω・｀⊂)"
];

class HugsCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^hug\b/i.test(message.content)) return;

        const mention = message.mentions.members.first();
        let text = message.content;
        for (let user of message.mentions.members.array()) {
            text = text.replace(user.toString(), "");
        }
        text = text.replace(/\s+/g, " ");
        const tmp = text.substr(4);
        let number = 1;
        if (tmp !== "") {
            number = parseInt(tmp);
        }
        const hug = hugs[number - 1];
        if (!hug) return await message.channel.send(this.usage(message.prefix));
        await message.channel.send(hug.replace("{{name}}", mention.displayName));
        log(`Requested hug. Given ${hug}`);
    }
    usage(prefix) {
        return `\`${prefix}hugs <user mention> <?intensity>\` hug someone!!!!!`;
    }
}

module.exports = HugsCommand;
