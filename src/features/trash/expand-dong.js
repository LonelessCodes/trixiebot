const { timeout } = require("../../modules/util");
const log = require("../../modules/log");
const Command = require("../../class/Command");

class ExpandCommand extends Command{
    async onmessage(message) {
        if (/^expand dong\b/i.test(message.content)) {
            let progress = 3;
            const dick = await message.channel.send(`8${new Array(progress).fill("=").join("")}D`);
            while (progress++ < 30) {
                await timeout(1000); // can't go faster because of rate limits
                await dick.edit(`8${new Array(progress).fill("=").join("")}D`);
            }
            log("Requested dong");
        }
    }
}

module.exports = ExpandCommand;
