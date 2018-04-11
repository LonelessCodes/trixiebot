const fetch = require("node-fetch");
const log = require("../../modules/log");
const Command = require("../../class/Command");

async function randomCat() {
    const response = await fetch("http://aws.random.cat/meow");
    const result = await response.json();

    return result.file;
}

class CatCommand extends Command{
    async onmessage(message) {
        if (/^!cat\b/i.test(message.content)) {
            await message.channel.send("meow :3 " + await randomCat());
            log("Requested random cat :3 meow");
        }
    }
    get usage() {
        return "`!cat` returns cat image :3";
    }
}

module.exports = CatCommand;
