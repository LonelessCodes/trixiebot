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

// indicate a new app lifecycle
bannerPrinter(info.VERSION, Discord.version);

new class App {
    constructor() {
        this.client = new Discord.Client({ autoReconnect: true }).setMaxListeners(Infinity);

        this.attachClientListeners();

        this.initialize()
            .then(() => log.namespace("app", "Ready uwu.", `bootup_time:${(bootup_timer.end() / nanoTimer.NS_PER_SEC).toFixed(3)}s`))
            .catch(err => {
                log.error("Failed to log in", err);
                process.exit(1);
            });
    }

    async initialize() {
        this.db = await database();
        log.namespace("db", "Connected");

        const { Parameter } = ConfigManager;
        this.config = new ConfigManager(this.client, this.db, [
            new Parameter("prefix", "❗ Prefix", config.get("prefix") || "!", String),

            // new Parameter("calling", "📞 Accept calls servers", false, Boolean),
            new Parameter("uom", "📐 Measurement preference", "cm", ["cm", "in"]),

            new Parameter([
                new Parameter("announce.channel", "Channel. 'none' disables announcements", null, Discord.TextChannel, true),
                new Parameter("announce.bots", "Announce Bots", true, Boolean)
            ], "🔔 Announce new/leaving/banned users"),

            new Parameter([
                new Parameter("welcome.enabled", "true/false", false, Boolean),
                new Parameter("welcome.text", "Custom Text ('{{user}}' as user, empty = default)", null, String, true)
            ], "👋 Announce new users"),

            new Parameter([
                new Parameter("leave.enabled", "true/false", false, Boolean),
                new Parameter("leave.text", "Custom Text ('{{user}}' as user, empty = default)", null, String, true)
            ], "🚶 Announce leaving users"),

            new Parameter([
                new Parameter("ban.enabled", "true/false", false, Boolean),
                new Parameter("ban.text", "Custom Text ('{{user}}' as user, empty = default)", null, String, true)
            ], "🔨 Announce banned users")
        ]);

        this.locale = new LocaleManager(this.client, this.db, [
            "en", "de", "hu"
        ]);

        this.client.db = this.db;
        this.client.config = this.config;
        this.client.locale = this.locale;
        
        if (!config.has("discord.token")) throw new Error("No Discord API Token specified in config files");

        await new Promise(resolve => {
            this.client.once("ready", () => resolve());

            djs_log("Connecting...");
            this.client.login(config.get("discord.token"));
        });

        this.core = new Core(this.client, this.config, this.db);

        await this.core.startMainComponents("commands");
    }

    attachClientListeners() {
        this.client.addListener("warn", warn => djs_log.warn(warn));

        this.client.addListener("error", error => djs_log.error(
            error.stack ||
                error.error ?
                error.error.stack || error.error :
                error
        ));

        this.client.addListener("ready", () => djs_log("Ready"));

        this.client.addListener("disconnect", closeEvent => djs_log(closeEvent));

        this.client.addListener("reconnecting", () => djs_log("Reconnecting"));

        this.client.addListener("resume", replayed => djs_log(`Replayed ${replayed} events`));
    }
};

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
