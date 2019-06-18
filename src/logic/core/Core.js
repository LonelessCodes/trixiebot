const config = require("../../config");
const statuses = require("../../../assets/text/statuses");
const request = require("request-promise-native");
const log = require("../../modules/log");
const nanoTimer = require("../../modules/NanoTimer");
const { walk } = require("../../modules/util");
const helpToJSON = require("../../modules/util/helpToJSON");
const path = require("path");
const fs = require("fs-extra");
const secureRandom = require("../../modules/secureRandom");
const WebsiteManager = require("../managers/WebsiteManager");
const CommandProcessor = require("../processor/CommandProcessor");
// eslint-disable-next-line no-unused-vars
const ConfigManager = require("../managers/ConfigManager");
const UpvotesManager = require("../managers/UpvotesManager");
const CalendarEvents = require("../CalendarEvents");

// eslint-disable-next-line no-unused-vars
const { Client } = require("discord.js");

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

        this.db = db;

        this.processor = new CommandProcessor(this.client, this.config, this.db);
        this.website = new WebsiteManager(this.processor.REGISTRY, this.client, this.config, this.db);
        this.upvotes = new UpvotesManager(this.client, this.db);
    }

    async startMainComponents(commands_package) {
        for (const voice of this.client.voiceConnections.array()) {
            voice.disconnect();
        }

        await this.loadCommands(commands_package);
        await this.attachListeners();
        await this.setStatus();
        this.setupDiscordBots();
    }

    async loadCommands(commands_package) {
        if (!commands_package) throw new Error("Cannot load commands if not given a path to look at!");

        log("Installing Commands...");

        const files = await walk(path.resolve(__dirname, "..", "..", commands_package));

        await Promise.all(files.map(async file => {
            if (path.extname(file) !== ".js") return;

            const timer = nanoTimer();

            const install = require(path.resolve("../../" + commands_package, file));
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

        await fs.writeFile(path.join(process.cwd(), "assets", "commands.json"), JSON.stringify(jason, null, 2));
        await fs.writeFile(path.join(process.cwd(), "..", "trixieweb", "client", "src", "assets", "commands.json"), JSON.stringify(jason, null, 2));

        log("Commands installed");
    }

    async attachListeners() {
        this.client.addListener("message", message => this.processor.onMessage(message));
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
            else status = await secureRandom(statuses);

            this.client.user.setStatus("online");
            this.client.user.setActivity(`!trixie | ${status}`, { type: "PLAYING" });
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
        this.updateStatistics();
        setInterval(() => this.updateStatistics(), 1800 * 1000);
    }

    async updateStatistics() {
        const server_count = this.client.guilds.size;

        const promises = [];

        if (config.has("botlists.divinediscordbots_com"))
            promises.push(request.post(`https://divinediscordbots.com/bot/${this.client.user.id}/stats`, {
                json: { server_count },
                headers: {
                    Authorization: config.get("botlists.divinediscordbots_com")
                }
            }).catch(err => err));
        
        if (config.has("botlists.botsfordiscord_com"))
            promises.push(request.post(`https://botsfordiscord.com/api/bot/${this.client.user.id}`, {
                json: { server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.botsfordiscord_com")
                }
            }).catch(err => err));

        if (config.has("botlists.discord_bots_gg"))
            promises.push(request.post(`https://discord.bots.gg/api/v1/bots/${this.client.user.id}/stats`, {
                json: { guildCount: server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.discord_bots_gg")
                }
            }).catch(err => err));

        if (config.has("botlists.botlist_space"))
            promises.push(request.post(`https://botlist.space/api/bots/${this.client.user.id}`, {
                json: { server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.botlist_space")
                }
            }).catch(err => err));

        if (config.has("botlists.ls_terminal_ink"))
            promises.push(request.post(`https://ls.terminal.ink/api/v2/bots/${this.client.user.id}`, {
                json: { bot: { count: server_count } },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.ls_terminal_ink")
                }
            }).catch(err => err));

        if (config.has("botlists.discordbotlist_com"))
            promises.push(request.post(`https://discordbotlist.com/api/bots/${this.client.user.id}/stats`, {
                json: {
                    guilds: server_count,
                    users: this.client.guilds.reduce((prev, curr) => prev + curr.memberCount, 0),
                    voice_connections: this.client.voiceConnections.size
                },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bot " + config.get("botlists.discordbotlist_com")
                }
            }).catch(err => err));

        if (config.has("botlists.discordbots_org"))
            promises.push(request.post(`https://discordbots.org/api/bots/${this.client.user.id}/stats`, {
                json: { server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.discordbots_org")
                }
            }).catch(err => err));

        await Promise.all(promises);
    }
}

module.exports = Core;