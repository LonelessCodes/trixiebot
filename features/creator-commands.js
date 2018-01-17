const log = require("../modules/log");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const { promisify } = require("util");
const Command = require("../modules/Command");

const command = new Command(async function onmessage(message) {
    const permission = message.author.id === "108391799185285120"; // this id is the bot's creator id

    if (/^\!file\b/i.test(message.content)) {
        if (!permission) {
            await message.channel.send("no");
            log("Gracefully aborted attempt to access creator functions");
            return;
        }

        const msg = message.content.substr(6);
        const content = await fs.readFile(path.join(process.cwd(), msg), "utf8");
        await message.channel.send(msg + "\n```\n" + content + "\n```");
        log(`Sent file contents of ${msg}`);
        return;
    }

    if (/^\!exec\b/i.test(message.content)) {
        if (!permission) {
            await message.channel.send("no");
            log("Gracefully aborted attempt to access creator functions");
            return;
        }
        
        const msg = message.content.substr(6);
        const content = await promisify(exec)(msg);
        await message.channel.send("```\n" + content.stdout.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "") + "\n```");
        log(`Sent stdout for command ${msg}`);
        return;
    }
}, {
    usage: `\`!file <path>\`
\`!exec <command>\``
});

module.exports = command;
