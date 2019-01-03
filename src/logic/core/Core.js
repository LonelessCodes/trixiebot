const botlist_keys = require("../../../keys/botlist_keys.json");
const request = require("request-promise-native");
const log = require("../../modules/log");
const info = require("../../info");
const NanoTimer = require("../../modules/NanoTimer");
const { walk } = require("../../modules/util");
const helpToJSON = require("../../logic/managers/website/helpToJSON.js");
const stats = require("../stats");
const path = require("path");
const fs = require("fs-extra");
const secureRandom = require("../../modules/secureRandom");
const WebsiteManager = require("../managers/WebsiteManager");
const CommandProcessor = require("../processor/CommandProcessor");
const CommandListener = require("../listener/CommandListener");
// eslint-disable-next-line no-unused-vars
const ConfigManager = require("../managers/ConfigManager");
const UpvotesManager = require("../managers/UpvotesManager");
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

        this.processor = new CommandProcessor(this.client, this.config, this.db);
        this.website = new WebsiteManager(this.processor.REGISTRY, this.client, this.config, this.db);
        this.commandListener = new CommandListener(this.processor);
        this.upvotes = new UpvotesManager(this.client, this.db);
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
        if (!info.DEV) this.setupDiscordBots();
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

    setupDiscordBots() {
        this.client.addListener("guildCreate", () => this.updateStatistics());
        this.client.addListener("guildDelete", () => this.updateStatistics());

        this.updateStatistics();
    }

    async updateStatistics() {
        const {
            "divinediscordbots.com": divinediscordbots_key,
            "botsfordiscord.com": botsfordiscord_key,
            "discord.bots.gg": discordbotsgg_key,
            "botlist.space": botlistspace_key,
            "terminal.ink": terminalink_key,
            "discordbotlist.com": discordbotlist_key,
            "discordbots.org": discordbots_key
        } = botlist_keys;

        const server_count = this.client.guilds.size;

        const response = await Promise.all([
            request.post(`https://divinediscordbots.com/bots/${this.client.user.id}/stats`, {
                json: { server_count },
                headers: {
                    Authorization: divinediscordbots_key
                }
            }).catch(err => err),
            request.post(`https://botsfordiscord.com/api/bot/${this.client.user.id}`, {
                json: { server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: botsfordiscord_key
                }
            }).catch(err => err),
            request.post(`https://discord.bots.gg/api/v1/bots/${this.client.user.id}/stats`, {
                json: { guildCount: server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: discordbotsgg_key
                }
            }).catch(err => err),
            request.post(`https://botlist.space/api/bots/${this.client.user.id}`, {
                json: { server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: botlistspace_key
                }
            }).catch(err => err),
            request.post(`https://ls.terminal.ink/api/v2/bots/${this.client.user.id}`, {
                json: { bot: { count: server_count } },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: terminalink_key
                }
            }).catch(err => err),
            request.post(`https://discordbotlist.com/api/bots/${this.client.user.id}/stats`, {
                json: {
                    guilds: server_count,
                    users: this.client.users.size,
                    voice_connections: this.client.voiceConnections.size
                },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bot " + discordbotlist_key
                }
            }).catch(err => err),
            request.post(`https://discordbots.org/api/bots/${this.client.user.id}/stats`, {
                json: { server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: discordbots_key
                }
            }).catch(err => err)
        ]);

        log.debug("Bot List", "Stats updated");
    }
}

module.exports = Core;