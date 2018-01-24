const log = require("../modules/log");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const { promisify } = require("util");
const {resolveStdout} = require("../modules/util");
const Command = require("../class/Command");

const extnames = {
    ".js": "javascript",
    ".css": "css",
    ".html": "html",
    ".md": "markdown",
    ".json": "json"
};

const command = new Command(async function onmessage(message) {
    const permission = message.author.id === "108391799185285120"; // this id is the bot's creator id

    if (/^!file\b/i.test(message.content)) {
        if (!permission) {
            await message.channel.send("no");
            log("Gracefully aborted attempt to access creator functions");
            return;
        }

        const msg = message.content.substr(6);
        const content = await fs.readFile(path.join(process.cwd(), msg), "utf8");
        const language = extnames[path.extname(msg)] || "";
        await message.channel.send(`\`\`\`${language}\n${content}\n\`\`\``);
        log(`Sent file contents of ${msg}`);
        return;
    }

    if (/^!exec\b/i.test(message.content)) {
        if (!permission) {
            await message.channel.send("no");
            log("Gracefully aborted attempt to access creator functions");
            return;
        }

        const msg = message.content.substr(6);
        const content = await promisify(exec)(msg);
        await message.channel.send("```\n" + resolveStdout(content.stdout + content.stderr) + "\n```");
        log(`Sent stdout for command ${msg}`);
        return;
    }

    if (/^!eval\b/i.test(message.content)) {
        if (!permission) {
            await message.channel.send("no");
            log("Gracefully aborted attempt to access creator functions");
            return;
        }

        const msg = message.content.substr(6);
        const content = await eval(msg);
        await message.channel.send("```\n" + content + "\n```");
        log(`Evaluated ${msg} and sent result`);
        return;
    }
}, {
    usage: `\`!file <path>\`
\`!exec <command>\``
});

module.exports = command;
