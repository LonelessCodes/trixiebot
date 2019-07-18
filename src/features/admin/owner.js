const log = require("../../modules/log").namespace("owner cmd");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const { promisify } = require("util");
const { resolveStdout, findDefaultChannel, isOwner } = require("../../modules/util");
const { splitArgs } = require("../../modules/util/string");
const ipc = require("../../logic/ipc");
const Discord = require("discord.js");

const SimpleCommand = require("../../class/SimpleCommand");
const BaseCommand = require("../../class/BaseCommand");
const Category = require("../../logic/commands/Category");

const extnames = {
    ".js": "javascript",
    ".css": "css",
    ".html": "html",
    ".md": "markdown",
    ".json": "json"
};

// eslint-disable-next-line no-unused-vars
module.exports = async function install(cr, client, config, db) {
    cr.registerCommand("file", new class extends BaseCommand {
        async noPermission(message) { await message.channel.sendTranslated("no"); }

        async call(message, msg) {
            const file = path.resolve(path.join(process.cwd(), msg));
            if (!(await fs.exists(file))) {
                await message.channel.send("Doesn't exist");
                return;
            }

            const stat = await fs.stat(file);

            if (!stat.isFile()) {
                await message.channel.send("Not a file. Sorry :(");
                return;
            }

            if (stat.size > 1024 * 15) {
                await message.channel.send(`File too big. Should be smaller than 15kb, but this one is freaking huuuuuge: ${stat.size / 1024}kb`);
                return;
            }

            const language = extnames[path.extname(msg)] || "";
            const highWaterMark = 2000 - 2 * 4 - language.length;

            let tmp = await fs.readFile(file, { encoding: "utf8" });

            while (tmp.length > 0) {
                let lastIndex = tmp.substring(0, highWaterMark).lastIndexOf("\n");
                const result = tmp.substring(0, lastIndex).replace(/`/g, "´");
                tmp = tmp.substring(lastIndex + 1);
                await message.channel.send(`\`\`\`${result}\`\`\``);
            }

            log(`Sent file contents of ${msg}`);
        }
    }).setIgnore(false).setCategory(Category.OWNER);

    cr.registerCommand("exec", new SimpleCommand(async (message, msg) => {
        const content = await promisify(exec)(msg);
        let escaped = resolveStdout("Out:\n" + content.stdout + "\nErr:\n" + content.stderr);

        while (escaped.length > 0) {
            let lastIndex = escaped.substring(0, 2000 - 2 * 3).lastIndexOf("\n");
            const result = escaped.substring(0, lastIndex).replace(/`/g, "´");
            escaped = escaped.substring(lastIndex + 1);
            await message.channel.send(`\`\`\`${result}\`\`\``);
        }

        log(`Sent stdout for command ${msg}`);
    })).setIgnore(false).setCategory(Category.OWNER);

    cr.registerCommand("eval", new SimpleCommand(async (message, msg) => {
        const content = await eval(`(async () => {${msg}})()`);
        await message.channel.send("```\n" + content + "\n```");
        log(`Evaluated ${msg} and sent result`);
    })).setIgnore(false).setCategory(Category.OWNER);

    cr.registerCommand("broadcast", new SimpleCommand(async (message, msg) => {
        client.guilds.forEach(guild => {
            if (!guild.available) return;
            const defaultChannel = findDefaultChannel(guild);
            if (!defaultChannel) return;
            defaultChannel.send("Broadcast from creator", { embed: new Discord.RichEmbed().setDescription(msg) }).catch(() => { });
        });
        log(`Broadcasted message ${msg}`);
    })).setIgnore(false).setCategory(Category.OWNER);

    cr.registerCommand("send", new SimpleCommand(async (message, msg) => {
        const s = splitArgs(msg, 2);
        const guild = client.guilds.get(s[0]);
        if (!guild.available) return;
        const defaultChannel = findDefaultChannel(guild);
        defaultChannel.send(s[1]);
    })).setIgnore(false).setCategory(Category.OWNER);

    client.addListener("message", async message => {
        if (message.author.bot) return;
        if (message.channel.type !== "dm") return;
        if (!isOwner(message.author)) return;

        if (!/^(backup|database|mongoarchive)\b/i.test(message.content)) return;

        const url = await ipc.awaitAnswer("admin:mongoarchive");

        await message.channel.send(`Get your archive here: ${url}`);
    });
};