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

const request = require("request-promise-native");
const path = require("path");
const fs = require("fs-extra");

const log = require("../log").namespace("core");
const config = require("../config");
const { walk } = require("../util/files");
const helpToJSON = require("../util/commands/helpToJSON");
const nanoTimer = require("../modules/nanoTimer");
const random = require("../modules/random/random");
const calendar_events = require("../modules/calendar_events");
const AliasCommand = require("./commands/AliasCommand");
const CommandScope = require("../util/commands/CommandScope");
// eslint-disable-next-line no-unused-vars
const ConfigManager = require("./managers/ConfigManager");

const CommandProcessor = require("./CommandProcessor");
const WebsiteManager = require("./managers/WebsiteManager");
const UpvotesManager = require("./managers/UpvotesManager");
const MemberLog = require("./listeners/MemberLog");

// eslint-disable-next-line no-unused-vars
const { Client } = require("discord.js");

class Core {
    /**
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

        this.member_log = new MemberLog(this.client, this.config);
    }

    async startMainComponents(commands_package) {
        for (const voice of this.client.voiceConnections.array()) voice.disconnect();

        await this.client.user.setStatus("dnd");
        await this.client.user.setActivity("!trixie | Booting...", { type: "PLAYING" });

        await this.loadCommands(commands_package);
        await this.attachListeners();
        await this.setStatus();
        this.setupDiscordBots();
    }

    async loadCommands(commands_package) {
        if (!commands_package) throw new Error("Cannot load commands if not given a path to look at!");

        log("Installing Commands...");

        const timer = nanoTimer();

        const files = await walk(path.resolve(__dirname, "..", commands_package))
            .then(files => files.filter(file => path.extname(file) === ".js"));

        await Promise.all(files.map(async file => {
            const install = require(path.resolve("../" + commands_package, file));
            await install(this.processor.REGISTRY, this.client, this.config, this.db);
        }));

        const install_time = timer.end() / nanoTimer.NS_PER_SEC;

        log("Building commands.json");

        const jason = {
            prefix: this.config.default_config.prefix,
            commands: [],
        };

        for (const [name, cmd] of this.processor.REGISTRY.commands) {
            if (cmd instanceof AliasCommand) continue;
            if (!cmd.help) continue;
            if (!cmd.hasScope(CommandScope.FLAGS.GUILD)) continue;
            if (!cmd.isInSeason()) continue;
            jason.commands.push({
                name,
                help: helpToJSON(this.config.default_config, name, cmd),
            });
        }

        const str = JSON.stringify(jason, null, 2);
        await fs.writeFile(path.join(process.cwd(), "assets", "commands.json"), str, { mode: 0o666 });
        await fs.writeFile(path.join(process.cwd(), "..", "trixieweb", "client", "src", "assets", "commands.json"), str, { mode: 0o666 });

        const build_time = (timer.end() / nanoTimer.NS_PER_SEC) - install_time;

        log(`Commands installed. files:${files.length} commands:${this.processor.REGISTRY.commands.size} install_time:${install_time.toFixed(3)}s build_time:${build_time.toFixed(3)}s`);
    }

    attachListeners() {
        this.client.addListener("message", message => this.processor.onMessage(message));
    }

    async setStatus() {
        let timeout = null;

        const statuses = await fs.readFile(path.join(__dirname, "../../assets/text/statuses.txt"), "utf8")
            .then(txt => txt.split("\n").filter(s => s !== ""));

        const updateStatus = () => {
            clearTimeout(timeout);
            timeout = setTimeout(updateStatus, 20 * 60000);

            let status = null;
            for (let event of calendar_events) {
                if (!event.isToday()) continue;

                status = event.getStatus();
                break;
            }

            status = status || random(statuses);

            this.client.user.setStatus("online");
            this.client.user.setActivity(`!trixie | ${status}`, { type: "PLAYING" });
        };

        for (let event of calendar_events) {
            event.on("start", updateStatus).on("end", updateStatus);
        }

        updateStatus();
    }

    setupDiscordBots() {
        this.updateStatistics();
        setInterval(() => this.updateStatistics(), 3600 * 1000);
    }

    async updateStatistics() {
        const server_count = this.client.guilds.size;

        const promises = [];

        if (config.has("botlists.divinediscordbots_com"))
            promises.push(request.post(`https://divinediscordbots.com/bot/${this.client.user.id}/stats`, {
                json: { server_count },
                headers: {
                    Authorization: config.get("botlists.divinediscordbots_com"),
                },
            }).catch(err => err));

        if (config.has("botlists.botsfordiscord_com"))
            promises.push(request.post(`https://botsfordiscord.com/api/bot/${this.client.user.id}`, {
                json: { server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.botsfordiscord_com"),
                },
            }).catch(err => err));

        if (config.has("botlists.discord_bots_gg"))
            promises.push(request.post(`https://discord.bots.gg/api/v1/bots/${this.client.user.id}/stats`, {
                json: { guildCount: server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.discord_bots_gg"),
                },
            }).catch(err => err));

        if (config.has("botlists.botlist_space"))
            promises.push(request.post(`https://botlist.space/api/bots/${this.client.user.id}`, {
                json: { server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.botlist_space"),
                },
            }).catch(err => err));

        if (config.has("botlists.ls_terminal_ink"))
            promises.push(request.post(`https://ls.terminal.ink/api/v2/bots/${this.client.user.id}`, {
                json: { bot: { count: server_count } },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.ls_terminal_ink"),
                },
            }).catch(err => err));

        if (config.has("botlists.discordbotlist_com"))
            promises.push(request.post(`https://discordbotlist.com/api/bots/${this.client.user.id}/stats`, {
                json: {
                    guilds: server_count,
                    users: this.client.guilds.reduce((prev, curr) => prev + curr.memberCount, 0),
                    voice_connections: this.client.voiceConnections.size,
                },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bot " + config.get("botlists.discordbotlist_com"),
                },
            }).catch(err => err));

        if (config.has("botlists.discordbots_org"))
            promises.push(request.post(`https://discordbots.org/api/bots/${this.client.user.id}/stats`, {
                json: { server_count },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: config.get("botlists.discordbots_org"),
                },
            }).catch(err => err));

        await Promise.all(promises);
    }
}

module.exports = Core;
