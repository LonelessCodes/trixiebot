const log = require("../../modules/log");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const { promisify } = require("util");
const { resolveStdout, findDefaultChannel } = require("../../modules/util");
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
    async onbeforemessage(message) {
        const permission = message.author.id === "108391799185285120"; // this id is the bot's creator id

        if (/^!file\b/i.test(message.content)) {
            if (!permission) {
                await message.channel.send("no");
                log("Gracefully aborted attempt to access creator functions");
                return;
            }

            const msg = message.content.substr(6);
            const file = path.join(process.cwd(), msg);
            const stat = await fs.stat(file);
            
            if (!stat.isFile()) {
                await message.channel.send("Not a file. Sorry :(");
                log("Gracefully aborted attempt to read file. Not a file");
                return;
            }

            if (stat.size > 1024 * 15) {
                await message.channel.send(`File too big. Should be smaller than 15kb, but this one is freaking huuuuuge: ${stat.size / 1024}kb`);
                log("Gracefully aborted attempt to read file. Not a file");
                return;
            }

            const language = extnames[path.extname(msg)] || "";
            const highWaterMark = 2000 - 2 * 4 - language.length;

            let tmp = "";
            const stream = fs.createReadStream(file, { encoding: "utf8", highWaterMark });
            stream.on("data", async data => {
                do {
                    const string = tmp + data;
                    let lastIndex = string.substring(0, highWaterMark).lastIndexOf("\n");
                    const result = string.substring(0, lastIndex).replace(/`/g, "´");
                    tmp = string.substring(lastIndex + 1);
                    message.channel.send(`\`\`\`${language}\n${result}\n\`\`\``);
                } while (tmp.length > highWaterMark);
            });
            stream.on("end", async () => {
                while (tmp.length > 0) {
                    const string = tmp;
                    let lastIndex = string.substring(0, highWaterMark).lastIndexOf("\n");
                    const result = string.substring(0, lastIndex).replace(/`/g, "´");
                    tmp = string.substring(lastIndex + 1);
                    message.channel.send(`\`\`\`${result}\`\`\``);
                }
                log(`Sent file contents of ${msg}`);
            });
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
                const defaultChannel = findDefaultChannel(guild);
                defaultChannel.send("Broadcast from creator", { embed: new Discord.RichEmbed().setDescription(msg) });
            });
            log(`Broadcasted message ${msg}`);
            return;
        }
    }

    get ignore() { return false; }

    usage() {
        return `\`!file <path>\`
\`!exec <command>\`
\`!eval <code>\`
\`!broadcast <message>\``;
    }
}

module.exports = CreatorCommands;
