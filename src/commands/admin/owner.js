/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const { promisify } = require("util");
const { findDefaultChannel } = require("../../util/util");
const { resolveStdout } = require("../../util/string");
const { splitArgs } = require("../../util/string");
const ipc = require("../../modules/concurrency/ipc");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const BaseCommand = require("../../core/commands/BaseCommand");
const Category = require("../../util/commands/Category");
const CommandScope = require("../../util/commands/CommandScope");

const extnames = {
    ".js": "javascript",
    ".css": "css",
    ".html": "html",
    ".md": "markdown",
    ".json": "json",
};

// eslint-disable-next-line no-unused-vars
module.exports = function install(cr, client, config, db) {
    cr.registerCommand("file", new class extends BaseCommand {
        async noPermission(message) { await message.channel.sendTranslated("no"); }

        async call(message, msg) {
            const file = path.resolve(path.join(process.cwd(), msg));
            if (!await fs.exists(file)) {
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
            const highWaterMark = 2000 - (2 * 4) - language.length;

            let tmp = await fs.readFile(file, { encoding: "utf8" });

            while (tmp.length > 0) {
                let lastIndex = tmp.substring(0, highWaterMark).lastIndexOf("\n");
                const result = tmp.substring(0, lastIndex).replace(/`/g, "´");
                tmp = tmp.substring(lastIndex + 1);
                await message.channel.send(`\`\`\`${result}\`\`\``);
            }
        }
    })
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);

    cr.registerCommand("exec", new SimpleCommand(async (message, msg) => {
        const content = await promisify(exec)(msg);
        let escaped = resolveStdout("Out:\n" + content.stdout + "\nErr:\n" + content.stderr);

        while (escaped.length > 0) {
            let lastIndex = escaped.substring(0, 2000 - (2 * 3)).lastIndexOf("\n");
            const result = escaped.substring(0, lastIndex).replace(/`/g, "´");
            escaped = escaped.substring(lastIndex + 1);
            await message.channel.send(`\`\`\`${result}\`\`\``);
        }
    }))
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);

    cr.registerCommand("eval", new SimpleCommand(async (message, msg) => {
        const content = await eval(`(async () => {${msg}})()`);
        return "```\n" + content + "\n```";
    }))
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);

    cr.registerCommand("send", new SimpleCommand(async (message, msg) => {
        const s = splitArgs(msg, 2);
        const guild = client.guilds.get(s[0]);
        if (!guild) {
            const channel = client.channels.get(s[0]);
            if (!channel) return "Channel doesn't exist";
            await channel.send(s[1]);
        } else {
            if (!guild.available) return "Guild not available";
            const defaultChannel = findDefaultChannel(guild);
            if (!defaultChannel) return "No default channel found";
            await defaultChannel.send(s[1]);
        }

        return "Successfully delivered!";
    }))
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);

    cr.registerCommand("backup", new SimpleCommand(async () => {
        const url = await ipc.awaitAnswer("admin:mongoarchive");

        return `Get your archive here: ${url}`;
    }))
        .setCategory(Category.OWNER)
        .setScope(CommandScope.FLAGS.DM);

    cr.registerCommand("reboot", new SimpleCommand(async message => {
        await message.channel.send("Gracefully rebooting...");

        await client.destroy();
        process.exit();
    }))
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);
};
