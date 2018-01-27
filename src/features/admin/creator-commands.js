const log = require("../../modules/log");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const { promisify } = require("util");
const { resolveStdout } = require("../../modules/util");
const Command = require("../../class/Command");
const Discord = require("discord.js");

const extnames = {
    ".js": "javascript",
    ".css": "css",
    ".html": "html",
    ".md": "markdown",
    ".json": "json"
};

class CreatorCommands extends Command {
    async onmessage(message) {
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

        if (/^!broadcast\b/i.test(message.content)) {
            if (!permission) {
                await message.channel.send("no");
                log("Gracefully aborted attempt to access creator functions");
                return;
            }

            const msg = message.content.substr(11);
            this.client.guilds.forEach(guild => {
                if (!guild.available) return;
                const defaultChannel = guild.channels.find(c => c.type === "text" && c.permissionsFor(guild.me).has("SEND_MESSAGES"));
                defaultChannel.send("@here Broadcast from creator", { embed: new Discord.RichEmded().setDescription(msg) });
            });
            log(`Sent stdout for command ${msg}`);
            return;
        }
    }
    get usage() {
        return `\`!file <path>\`
\`!exec <command>\``;
    }
    get ignore() {
        return false;
    }
}

module.exports = CreatorCommands;
