const fetch = require("node-fetch");
const dog = require("dog-ascii-faces");
const log = require("../../modules/log");
const BaseCommand = require("../../class/BaseCommand");

async function randomDog() {
    const response = await fetch("https://random.dog/woof.json");
    const result = await response.json();

    return result.url;
}

class CatCommand extends BaseCommand{
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^dog\b/i.test(message.content)) return;

        await message.channel.send(await message.channel.translate("woof") + " " + dog() + " " + await randomDog());
        log("Requested random dog :3 woof");
    }
    usage(prefix) {
        return `\`${prefix}dog\` returns dog image :3`;
    }
}

module.exports = CatCommand;
