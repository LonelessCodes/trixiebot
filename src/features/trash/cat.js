const fetch = require("node-fetch");
const cat = require("cat-ascii-faces");
const log = require("../../modules/log");
const Command = require("../../class/Command");

async function randomCat(reconnectTries = 0) {
    let file;
    try {
        const response = await fetch("http://aws.random.cat/meow");
        const result = await response.json();
        file = result.file;
    } catch (err) {
        reconnectTries++;
        if (reconnectTries > 5) throw err;
        file = await randomCat(reconnectTries);
    }

    return file;
}

class CatCommand extends Command{
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^cat\b/i.test(message.content)) return;

        await message.channel.send("meow " + cat() + " " + await randomCat());
        log("Requested random cat :3 meow");
    }
    usage(prefix) {
        return `\`${prefix}cat\` returns cat image :3`;
    }
}

module.exports = CatCommand;
