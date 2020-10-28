/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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
const { format } = require("util");
import moment from "moment";
import CalendarStatus from "../../modules/calendar/CalendarStatus";
import CalendarRange from "../../modules/calendar/CalendarRange";
const { findDefaultChannel, doNothing } = require("../../util/util");
const { resolveStdout } = require("../../util/string");
const { splitArgs } = require("../../util/string");
const ipc = require("../../modules/concurrency/ipc").default;

const SimpleCommand = require("../../core/commands/SimpleCommand");
const BaseCommand = require("../../core/commands/BaseCommand").default;
const Category = require("../../util/commands/Category").default;
const CommandScope = require("../../util/commands/CommandScope").default;

const extnames = {
    ".js": "javascript",
    ".css": "css",
    ".html": "html",
    ".md": "markdown",
    ".json": "json",
};

async function sendLargeText(channel, str, lang = "") {
    const collector = channel.createMessageCollector(m => m.content.toLowerCase() === "quit!", { max: 1 });
    let quit = false;
    collector.once("collect", () => (quit = true));

    do {
        if (quit) break;

        let lastIndex = str.substring(0, 2000 - (2 * 4) - lang.length).lastIndexOf("\n");
        if (lastIndex === -1) lastIndex = 2000 - (2 * 4) - lang.length;

        const result = str.substring(0, lastIndex).replace(/`/g, "´");
        await channel.send("```" + lang + "\n" + result + "\n```");
        str = str.substring(lastIndex + 1); // + 1 because of the last \n
    } while (str.length > 0);

    collector.stop();
}

// eslint-disable-next-line no-unused-vars
module.exports = function install(cr, { client, config, locale, db, presence_status }) {
    cr.registerCommand("file", new class extends BaseCommand {
        async noPermission(context) {
            await context.send("no");
        }

        async call({ message, content }) {
            const file = path.resolve(path.join(process.cwd(), content));

            const stat = await fs.stat(file);

            if (!stat.isFile()) {
                await message.channel.send("Not a file. Sorry :(");
                return;
            }

            if (stat.size > 1024 * 15) {
                await message.channel.send(`File too big. Should be smaller than 15kb, but this one is freaking huuuuuge: ${stat.size / 1024}kb`);
                return;
            }

            const language = extnames[path.extname(content)] || "";
            const file_content = await fs.readFile(file, { encoding: "utf8" });

            await sendLargeText(message.channel, file_content, language);
        }
    }())
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);

    cr.registerCommand("exec", new SimpleCommand(({ message, content }) => {
        exec(content, async (error, stdout, stderr) => {
            await sendLargeText(message.channel, resolveStdout("Out:\n" + stdout + "\nErr:\n" + stderr + "\nCode: " + (error?.code || 0)));
        });
    }))
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);

    // eslint-disable-next-line no-unused-vars
    cr.registerCommand("eval", new SimpleCommand(async ({ message, ctx, content }) => {
        const result = await eval(`(async () => {${content}})()`);
        await sendLargeText(message.channel, format(result));
    }))
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);

    cr.registerCommand("send", new SimpleCommand(async ({ content }) => {
        const s = splitArgs(content, 2);
        const guild = client.guilds.cache.get(s[0]);
        if (!guild) {
            const channel = await client.channels.fetch(s[0]).catch(doNothing);
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

    cr.registerCommand("setstatus", new SimpleCommand(async ctx => {
        const args = splitArgs(ctx.content, 3);

        const start = moment(args[0]);
        const end = moment(args[1]);
        const status = args[2];

        const event = new CalendarStatus(new CalendarRange(start, end), status);

        await presence_status.addCustomEvent(event);

        return `Event ${JSON.stringify(status)} starts ${moment().to(start)}`;
    }))
        .setCategory(Category.OWNER)
        .setScope(CommandScope.FLAGS.DM);

    cr.registerCommand("reboot", new SimpleCommand(async message => {
        await message.channel.send("Gracefully rebooting...");

        await client.destroy();
        process.exit();
    })).setCategory(Category.OWNER).setScope(CommandScope.ALL);
};
