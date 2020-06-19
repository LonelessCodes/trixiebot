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

const { TOTAL_SERVERS, TEXT_CHANNELS, TOTAL_USERS, COMMANDS_EXECUTED, MESSAGES_TODAY, ACTIVE_WEB_USERS, TOTAL_WEB_USERS } = require("../core/managers/BotStatsManager");
const os = require("os");
const { toHumanTime } = require("../util/time");
const { timeout } = require("../util/promises");
const getChangelog = require("../modules/getChangelog").default;
const INFO = require("../info").default;
const CONST = require("../const").default;
const nanoTimer = require("../modules/timer").default;
const Discord = require("discord.js");

function getCPUInfo() {
    const cpus = os.cpus();

    let user = 0;
    let nice = 0;
    let sys = 0;
    let idle = 0;
    let irq = 0;

    for (const cpu of cpus) {
        user += cpu.times.user;
        nice += cpu.times.nice;
        sys += cpu.times.sys;
        irq += cpu.times.irq;
        idle += cpu.times.idle;
    }

    const total = user + nice + sys + idle + irq;

    return {
        idle: idle,
        total: total,
    };
}

async function getCPUUsage() {
    const stats1 = getCPUInfo();
    const startIdle = stats1.idle;
    const startTotal = stats1.total;

    await timeout(1000);

    const stats2 = getCPUInfo();
    const endIdle = stats2.idle;
    const endTotal = stats2.total;

    const idle = endIdle - startIdle;
    const total = endTotal - startTotal;
    const perc = idle / total;

    return 1 - perc;
}

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const CommandScope = require("../util/commands/CommandScope").default;

const PaginatorAction = require("../modules/actions/PaginatorAction");

module.exports = function install(cr, { client, error_cases, bot_stats }) {
    cr.registerCommand(
        "info",
        new SimpleCommand(async () => new Discord.MessageEmbed()
            .setColor(CONST.COLOR.PRIMARY)

            .addField("Commands", cr.commands.size.toLocaleString("en"))

            .addField("Bot Version", INFO.VERSION, true)
            .addField("Node.js Version", process.version.substr(1), true)
            .addField("Discord.js Version", Discord.version)

            .addField("CPU Usage", ((await getCPUUsage()) * 100).toFixed(0) + "%", true)
            .addField("CPU Cores", os.cpus().length.toString(), true)
            .addField(
                "Memory Usage",
                (process.memoryUsage().rss / (1024 * 1024)).toFixed(2) +
                    " / " +
                    (os.totalmem() / (1024 * 1024)).toFixed(2) +
                    " MB"
            )

            .addField(
                "Uptime",
                "Server: " + toHumanTime(Math.floor(os.uptime() * 1000)) +
                ", Bot: " + toHumanTime(Math.floor(process.uptime() * 1000))
            )

            .addField("Total Servers", bot_stats.get(TOTAL_SERVERS).toLocaleString("en"), true)
            .addField("Text Channels", bot_stats.get(TEXT_CHANNELS).toLocaleString("en"), true)
            .addField("Total Users", bot_stats.get(TOTAL_USERS).toLocaleString("en"))

            .addField("Executed Commands", bot_stats.get(COMMANDS_EXECUTED).toLocaleString("en"), true)
            .addField("Processed Messages", bot_stats.get(MESSAGES_TODAY).toLocaleString("en"))

            .addField("Active Web Users", bot_stats.get(ACTIVE_WEB_USERS).toLocaleString("en"), true)
            .addField("Total Web Users", bot_stats.get(TOTAL_WEB_USERS).toLocaleString("en"))
        )
    )
        .setHelp(new HelpContent().setDescription("Gets the bot technical information. Nothing all that interesting."))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand(
        "ping",
        new SimpleCommand(async ({ message, received_at }) => {
            const internal_ping = nanoTimer.diff(received_at) / nanoTimer.NS_PER_MS;

            const pongText = "pong! Wee hee";
            const m = await message.channel.send(pongText);

            const ping = m.createdTimestamp - message.createdTimestamp;
            await m.edit(
                pongText +
                    "\n" +
                    "```" +
                    `⏱ Real Latency:     ${ping}ms\n` +
                    `⏱ Internal Latency: ${internal_ping.toFixed(1)}ms\n` +
                    `💓 API Latency:      ${Math.round(client.ws.ping)}ms\n` +
                    "```"
            );
        })
    )
        .setHelp(new HelpContent().setDescription("Ping-Pong-Ping-Pong-Ping-WEE HEEEEE."))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);
    cr.registerAlias("ping", "trixie ping");

    cr.registerCommand(
        "changelog",
        new SimpleCommand(async () => {
            const logs = await getChangelog();

            const latest = logs[0];
            const embed = new Discord.MessageEmbed().setColor(CONST.COLOR.PRIMARY);

            embed.setTitle("v" + latest.version);

            const s = latest.body.split("\n");
            let title = null;
            let str = "";
            for (const line of s) {
                if (line.startsWith("###")) {
                    if (title) embed.addField(title, str.trim().replace(/ \* /g, "\n* "));
                    else embed.setDescription(str.trim().replace(/ \* /g, "\n* "));
                    str = "";
                    title = line.replace(/^###+\s+/, "");
                } else str += line;
            }
            if (title) embed.addField(title, str.trim().replace(/ \* /g, "\n* "));
            else embed.setDescription(str.trim().replace(/ \* /g, "\n* "));

            embed.addField("Full Changelog:", INFO.WEBSITE + "/changelog");

            embed.setFooter("TrixieBot - Released " + latest.date, client.user.avatarURL({ size: 32, dynamic: true }));

            return { embed };
        })
    )
        .setHelp(new HelpContent().setDescription("Gets the changes made to TrixieBot in the latest versions"))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    // ERROR CASES

    cr.registerCommand("reporterror", new OverloadCommand())
        .registerOverload(
            "1+",
            new SimpleCommand(async ({ content: caseId }) => {
                await error_cases.reportError(caseId);
                return ":ok_hand: The error will go under review soon!";
            })
        )
        .setHelp(new HelpContent().setUsage("<error case id>", "Report a processing error"))
        .setCategory(Category.TRIXIE)
        .setScope(CommandScope.ALL);

    cr.registerCommand(
        "viewerrors",
        new SimpleCommand(async context => {
            const errs = await error_cases.getErrors();

            const items = [];

            for (const err of errs) {
                items.push(
                    "```\n" +
                        `${err.ts.toString().slice(4, 24)}   ${err._id}\n` +
                        "Message Id             User Id\n" +
                        `${err.message_id}     ${err.user_id}\n` +
                        "Channel Id             Guild Id\n" +
                        `${err.channel_id}     ${err.guild_id}\n` +
                        "Guild Large?           Channel Type\n" +
                        `${err.guild_large}                  ${err.channel_type}\n` +
                        "Memory Usage           Uptime\n" +
                        `${(err.memory_usage.rss / 1024 / 1024).toFixed(3)} MB             ${err.uptime / 1000} s\n` +
                        "Content\n" +
                        `${err.content.replace("`", "´")}\n` +
                        `${err.err.stack}\n` +
                        "```"
                );
            }

            await new PaginatorAction("Error Cases", "", items, context.author, { items_per_page: 1 }).display(
                context.channel,
                await context.translator()
            );
        })
    )
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);

    cr.registerCommand("approveerror", new OverloadCommand())
        .registerOverload(
            "1+",
            new SimpleCommand(async ({ content: caseId }) => {
                await error_cases.acknowledgeError(caseId);
                return ":ok_hand:";
            })
        )
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);
};
