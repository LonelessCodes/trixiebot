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

const nanoTimer = require("./modules/timer");
const bootup_timer = nanoTimer();

const config = require("./config");
const log = require("./log");
const djs_log = log.namespace("discord.js");
const bannerPrinter = require("./util/banner/bannerPrinter");
const info = require("./info");
const Discord = require("discord.js");
const database = require("./modules/db/database");
const Core = require("./core/Core");

// Why must you delete this method, Discord.js devs...
Discord.MessageEmbed.prototype.addBlankField = function addBlankField(inline = false) {
    return this.addField("\u200b", "\u200b", inline);
};

// Indicate a new app lifecycle
bannerPrinter(info.DEV, info.VERSION, Discord.version);

// Catch exceptions
process.addListener("uncaughtException", error => {
    log.error("UncaughtException:", error.stack || error);
    process.exit();
});

process.addListener("unhandledRejection", (reason, p) => {
    log.warn("UnhandledRejection:", p);
});

process.addListener("warning", warning => {
    log.warn("ProcessWarn:", warning.message, "\n", warning.stack); // Print the warning message // Print the stack trace
});

/*
 * ==== START BOT ====
 */

const client = new Discord.Client({
    autoReconnect: true,
    messageCacheMaxSize: 200,
    messageCacheLifetime: 60 * 10,
    messageSweepInterval: 60 * 10,

    presence: {
        status: "dnd",
        activity: {
            name: "!trixie | Booting...",
            type: "PLAYING",
        },
    },
});

// Attach listeners
client.addListener("warn", warn => djs_log.warn(warn));

client.addListener("error", error => djs_log.error(
    error.stack ||
        error.error ?
        error.error.stack || error.error :
        error
));

client.addListener("ready", () => djs_log("Ready"));

client.addListener("shardDisconnected", (closeEvent, shardId) => djs_log("Disconnected ID:" + shardId, closeEvent));

client.addListener("shardReconnecting", shardId => djs_log("Reconnecting ID:" + shardId));

client.addListener("shardResumed", (replayed, shardId) => djs_log(`Replayed ${replayed} events ID:${shardId}`));

// Initialize Bot
initialize(client)
    .then(() => {
        // tell pm2 that we are now ready
        if (typeof process.send === "function") process.send("ready");
    })
    .catch(err => {
        log.error("Failed to log in", err);
        exit(1); // 1 - Uncaught Fatal Exception
    });

async function initialize(client) {
    if (!config.has("discord.token")) throw new Error("No Discord API Token specified in config files");

    const db = await database();
    log.namespace("db", "Connected");

    await loginClient(client);

    const core = new Core(client, db);
    await core.startMainComponents("commands");
    log.namespace("app", "Ready uwu.", `bootup_time:${(nanoTimer.diff(bootup_timer) / nanoTimer.NS_PER_SEC).toFixed(3)}s`);
}

function loginClient(client) {
    return new Promise(resolve => {
        client.once("ready", () => resolve());

        djs_log("Connecting...");
        client.login(config.get("discord.token"));
    });
}

function exit(code = 0) {
    log("Gracefully exiting...");

    client.destroy();
    process.exit(code);
}

process.once("SIGTERM", exit);
process.once("SIGINT", exit);
