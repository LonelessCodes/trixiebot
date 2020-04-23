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

require("source-map-support").install({
    environment: "node",
    handleUncaughtExceptions: false,
});

import timer from "./modules/timer";
const bootup_timer = timer();

import log from "./log";
const djs_log = log.namespace("discord.js");

import config from "./config";
import bannerPrinter from "./util/banner/bannerPrinter";
import info from "./info";
import database from "./modules/db/database";
import Core from "./core/Core";
import Discord from "discord.js";

// Indicate a new app lifecycle
bannerPrinter(info.DEV, info.VERSION, Discord.version);

// Catch exceptions
process.addListener("uncaughtException", error => {
    log.error("UncaughtException:", error.stack || error);
    process.exit(1);
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

client.addListener("error", error => djs_log.error(error.stack || error.error ? error.error.stack || error.error : error));

client.addListener("ready", () => djs_log("Ready"));

client.addListener("shardDisconnected", (close_event, shard_id) => djs_log(`Disconnected ID:${shard_id}`, close_event));

client.addListener("shardReconnecting", shard_id => djs_log(`Reconnecting ID:${shard_id}`));

client.addListener("shardResumed", (replayed, shard_id) => djs_log(`Replayed ${replayed} events ID:${shard_id}`));

function loginClient(client: Discord.Client) {
    return new Promise(async (resolve, reject) => {
        client.once("ready", () => resolve());

        try {
            djs_log("Logging in...");
            await client.login(config.get("discord.token"));
            djs_log("Login success");
        } catch (err) {
            reject(err);
        }
    });
}

async function initialize(client: Discord.Client) {
    if (!config.has("discord.token")) throw new Error("No Discord API Token specified in config files");

    const db = await database();
    log.namespace("db", "Connected");

    await loginClient(client);

    const core = new Core(client, db);
    await core.startMainComponents("commands");
    log.namespace("app", "Ready uwu.", `bootup_time:${(timer.diff(bootup_timer) / timer.NS_PER_SEC).toFixed(3)}s`);
}

function exit(code = 0) {
    log("Gracefully exiting...");

    client.destroy();
    process.exit(code);
}

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

process.once("SIGTERM", () => exit());
process.once("SIGINT", () => exit());
