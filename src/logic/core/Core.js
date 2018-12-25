const log = require("../../modules/log");
const NanoTimer = require("../../modules/NanoTimer");
const { walk } = require("../../modules/utils");
const helpToJSON = require("../../logic/managers/website/helpToJSON.js");
const stats = require("../stats");
const statsDatabaseWrapper = require("../statsDatabaseWrapper");
const path = require("path");
const fs = require("fs-extra");
const secureRandom = require("../../modules/secureRandom");
const WebsiteManager = require("../managers/WebsiteManager");
const CommandProcessor = require("../processor/CommandProcessor");
const CommandListener = require("../listener/CommandListener");
// eslint-disable-next-line no-unused-vars
const ConfigManager = require("../managers/ConfigManager");
const CalendarEvents = require("../CalendarEvents");

const Discord = require("discord.js");
// eslint-disable-next-line no-unused-vars
const { Client } = Discord;

class Core {
    /**
     * 
     * @param {Client} client 
     * @param {ConfigManager} config
     * @param {Db} db
     */
    constructor(client, config, db) {
        this.client = client;
        this.config = config;

        this.commands_package = null;

        this.db = db;

        statsDatabaseWrapper(stats, this.db.collection("bot_stats"));

        this.processor = new CommandProcessor(this.client, this.config, this.db);
        this.website = new WebsiteManager(this.processor.REGISTRY, this.client, this.config, this.db);
        this.commandListener = new CommandListener(this.processor);
    }

    setCommandsPackage(commands_package) {
        this.commands_package = commands_package;
        return this;
    }

    async startMainComponents() {
        for (const voice of this.client.voiceConnections.array()) {
            voice.disconnect();
        }

        await this.loadCommands();
        await this.attachListeners();
        await this.setStatus();
    }

    async loadCommands() {
        if (!this.commands_package) throw new Error("Cannot load commands if not given a path to look at!");

        log("Installing Commands...");

        const files = await walk(path.resolve(__dirname, "..", "..", this.commands_package));

        await Promise.all(files.map(async file => {
            if (path.extname(file) !== ".js") return;

            const timer = new NanoTimer().begin();

            const install = require(path.resolve("../../" + this.commands_package, file));
            await install(this.processor.REGISTRY, this.client, this.config, this.db);

            log(`installed time:${(timer.end() / 1000000000).toFixed(3)}ms file:${path.basename(file)}`);
        }));

        const jason = {
            prefix: this.config.default_config.prefix,
            commands: []
        };

        for (const [name, cmd] of this.processor.REGISTRY.commands) {
            if (!cmd.help) continue;
            jason.commands.push({
                name,
                help: helpToJSON(this.config.default_config, name, cmd)
            });
        }

        await fs.writeFile(path.join(process.cwd(), "resources", "commands.json"), JSON.stringify(jason, null, 2));

        log("Commands installed");
    }

    async attachListeners() {
        this.client.addListener("message", message => {
            this.commandListener.onMessage(message);
        });
    }

    async setStatus() {
        let timeout = null;

        const updateStatus = async () => {
            clearTimeout(timeout);
            timeout = setTimeout(updateStatus, 20 * 60000);

            let status = "";
            if (CalendarEvents.CHRISTMAS.isToday()) status = "Merry Christmas!";
            else if (CalendarEvents.HALLOWEEN.isToday()) status = "Happy Halloween!";
            else if (CalendarEvents.NEW_YEARS.isToday()) status = "Happy New Year!";
            else {
                status = await secureRandom([
                    "Trixie is the highest level unicorn!",
                    "Cheated? Moi?",
                    "Hello... princess!",
                    "Behold, the Peat and Growerful Triskie...!",
                    "No fruit calls in my class!",
                    "Everypony deserves a second chance—even a third chance!",
                    "It's good to be the queen!",
                    "Trixie will go with you, too!",

                    // Season 7
                    "Whoops! I guess I pictured a teacup poodle? Heh.",
                    "[clears throat] Teleport.",

                    // Season 6 
                    "It's a working title.",
                    "I'd love to perform for peanut butter crackers...",
                    "Starlight? What time is it?"
                ]);
            }

            this.client.user.setStatus("online");
            this.client.user.setActivity(`!trixie | ${status}`, { type: "PLAYING" });

            log("Set Status: " + status);
        };

        CalendarEvents.CHRISTMAS.on("start", updateStatus);
        CalendarEvents.CHRISTMAS.on("end", updateStatus);
        CalendarEvents.HALLOWEEN.on("start", updateStatus);
        CalendarEvents.HALLOWEEN.on("end", updateStatus);
        CalendarEvents.NEW_YEARS.on("start", updateStatus);
        CalendarEvents.NEW_YEARS.on("end", updateStatus);

        updateStatus();
    }
}

module.exports = Core;