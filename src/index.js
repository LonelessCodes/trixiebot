const config = require("./config");
const log = require("./modules/log");
const info = require("./info");
const Discord = require("discord.js");
const getDatabase = require("./modules/getDatabase");
const ConfigManager = require("./logic/managers/ConfigManager");
const LocaleManager = require("./logic/managers/LocaleManager");
const Core = require("./logic/core/Core");

log("Running trixiebot v" + info.VERSION);

new class App {
    constructor() {
        this.client = new Discord.Client({ autoReconnect: true }).setMaxListeners(Infinity);

        this.attachClientListeners();

        this.initialize()
            .then(() => log.debug("App", "I am ready"))
            .catch(err => {
                log.error("Failed to log in");
                log.error(err);
                process.exit(1);
            });
    }

    async initialize() {
        this.db = await getDatabase();

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

        await new Promise(resolve => {
            this.client.once("ready", () => resolve());

            if (!config.has("discord.token")) throw new Error("No Discord API Token specified in config files");
            this.client.login(config.get("discord.token"));
        });

        this.core = new Core(this.client, this.config, this.db);

        await this.core.startMainComponents("features");
    }

    attachClientListeners() {
        this.client.addListener("warn", warn => log.warn("ClientError:", warn));

        this.client.addListener("error", error => log.error(
            error.stack ||
                error.error ?
                error.error.stack || error.error :
                error
        ));

        this.client.addListener("debug", debug => {
            if (/heartbeat/i.test(debug)) return;
            log.debug("discord.js", debug);
        });

        this.client.addListener("disconnect", closeEvent => log.debug("discord.js", closeEvent));

        this.client.addListener("reconnecting", () => log.debug("discord.js", "Reconnecting"));

        this.client.addListener("resume", replayed => log.debug("discord.js", `Replayed ${replayed} events`));
    }
};

process.addListener("uncaughtException", error => {
    log.error(error.stack || error);
    process.exit();
});

process.addListener("unhandledRejection", (reason, p) => {
    log.warn("UnhandledRejection:", p);
});

process.addListener("warning", warning => {
    log.warn("ProcessWarn:", warning.message, "\n", warning.stack); // Print the warning message // Print the stack trace
});
