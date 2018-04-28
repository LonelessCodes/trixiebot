const fetch = require("node-fetch");
const dog = require("dog-ascii-faces");
const log = require("../../modules/log");
const Command = require("../../class/Command");

async function randomDog() {
    const response = await fetch("https://random.dog/woof.json");
    const result = await response.json();

    return result.url;
}

class CatCommand extends Command{
    async onmessage(message) {
        if (/^dog\b/i.test(message.content)) {
            await message.channel.send("woof " + dog() + " " + await randomDog());
            log("Requested random dog :3 woof");
        }
    }
    usage(prefix) {
        return `\`${prefix}dog\` returns dog image :3`;
    }
}

module.exports = CatCommand;
