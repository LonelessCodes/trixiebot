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

const nanoTimer = require("./modules/nanoTimer");
const bootup_timer = nanoTimer();

const config = require("./config");
const log = require("./log");
const djs_log = log.namespace("discord.js");
const bannerPrinter = require("./util/banner/bannerPrinter");
const info = require("./info");
const Discord = require("discord.js");
const database = require("./modules/db/database");
const ConfigManager = require("./core/managers/ConfigManager");
const LocaleManager = require("./core/managers/LocaleManager");
const Core = require("./core/Core");

// Indicate a new app lifecycle
bannerPrinter(info.VERSION, Discord.version);

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

const client = new Discord.Client({ autoReconnect: true }).setMaxListeners(Infinity);

// Attach listeners
client.addListener("warn", warn => djs_log.warn(warn));

client.addListener("error", error => djs_log.error(
    error.stack ||
        error.error ?
        error.error.stack || error.error :
        error
));

client.addListener("ready", () => djs_log("Ready"));

client.addListener("disconnect", closeEvent => djs_log(closeEvent));

client.addListener("reconnecting", () => djs_log("Reconnecting"));

client.addListener("resume", replayed => djs_log(`Replayed ${replayed} events`));

// Initialize Bot
initialize(client)
    .then(() => log.namespace("app", "Ready uwu.", `bootup_time:${(bootup_timer.end() / nanoTimer.NS_PER_SEC).toFixed(3)}s`))
    .catch(err => {
        log.error("Failed to log in", err);
        process.exit(1);
    });

async function initialize(client) {
    const db = await database();
    log.namespace("db", "Connected");

    const { Parameter } = ConfigManager;
    const config_manager = new ConfigManager(client, db, [
        new Parameter("prefix", "❗ Prefix", config.get("prefix") || "!", String),

        // New Parameter("calling", "📞 Accept calls servers", false, Boolean),
        new Parameter("uom", "📐 Measurement preference", "cm", ["cm", "in"]),

        new Parameter([
            new Parameter("announce.channel", "Channel. 'none' disables announcements", null, Discord.TextChannel, true),
            new Parameter("announce.bots", "Announce Bots", true, Boolean),
        ], "🔔 Announce new/leaving/banned users"),

        new Parameter([
            new Parameter("welcome.enabled", "true/false", false, Boolean),
            new Parameter("welcome.text", "Custom Text ('{{user}}' as user, empty = default)", null, String, true),
        ], "👋 Announce new users"),

        new Parameter([
            new Parameter("leave.enabled", "true/false", false, Boolean),
            new Parameter("leave.text", "Custom Text ('{{user}}' as user, empty = default)", null, String, true),
        ], "🚶 Announce leaving users"),

        new Parameter([
            new Parameter("ban.enabled", "true/false", false, Boolean),
            new Parameter("ban.text", "Custom Text ('{{user}}' as user, empty = default)", null, String, true),
        ], "🔨 Announce banned users"),
    ]);

    const locale = new LocaleManager(client, db, [
        "en", "de", "hu",
    ]);

    client.db = db;
    client.config = config_manager;
    client.locale = locale;

    if (!config.has("discord.token")) throw new Error("No Discord API Token specified in config files");

    await new Promise(resolve => {
        client.once("ready", () => resolve());

        djs_log("Connecting...");
        client.login(config.get("discord.token"));
    });

    const core = new Core(client, config_manager, db);

    await core.startMainComponents("commands");
}
