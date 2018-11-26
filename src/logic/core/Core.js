const log = require("../../modules/log");
const NanoTimer = require("../../modules/NanoTimer");
const { walk } = require("../../modules/utils");
const stats = require("../stats");
const path = require("path");
const WebsiteManager = require("../managers/WebsiteManager");
const CommandProcessor = require("../processor/CommandProcessor");
const CommandListener = require("../listener/CommandListener");

const Discord = require("discord.js");
const { Message, Collector, Client } = Discord;

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

        this.processor = new CommandProcessor(this.client, this.config, this.db);
        this.website = new WebsiteManager(this.processor.REGISTRY, this.client, this.config, this.db);
        this.commandListener = new CommandListener(this.processor);
    }

    setCommandsPackage(commands_package) {
        this.commands_package = commands_package;
        return this;
    }

    async startMainComponents() {
        await this.loadCommands();
        await this.initCommandStats();
        await this.attachListeners();
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

        log("Commands installed");
    }

    async initCommandStats() {
        const commandStat = stats.get(stats.NAME.COMMANDS_EXECUTED);

        const statsDb = this.db.collection("bot_stats");

        commandStat.set((await statsDb.findOne({ name: stats.NAME.COMMANDS_EXECUTED }) || { value: 0 }).value);

        commandStat.on("change", value => statsDb.updateOne({ name: stats.NAME.COMMANDS_EXECUTED }, { $set: { value } }, { upsert: true }));

        /** @type {Map<string, Collector>} */
        this.collectors = new Map;

        // command statistics
        this.client.addListener("message", async message => {
            if (!message.content.startsWith(await this.config.get(message.guild.id, "prefix"))) return;

            if (typeof message.channel.awaitMessages !== "function") return;
            if (this.collectors.has(message.channel.id)) {
                this.collectors.get(message.channel.id).stop();
            }

            const collector = message.channel.createCollector(message => message.member.id === message.guild.me.id, {
                max: 1,
                maxMatches: 1,
                time: 60 * 1000
            });
            this.collectors.set(message.channel.id, collector);

            collector.once("end", (collected, reason) => {
                if (reason === "time") {
                    if (this.collectors.has(message.channel.id))
                        this.collectors.delete(message.channel.id);
                } else {
                    if (this.collectors.has(message.channel.id))
                        this.collectors.delete(message.channel.id);
                    if (!collected.size) return;
                    commandStat.inc(1);
                }
            });
        });
    }

    async attachListeners() {
        this.client.addListener("message", message => {
            this.commandListener.onMessage(message);
        });
    }
}

module.exports = Core;