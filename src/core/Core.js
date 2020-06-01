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

const fs = require("fs-extra");
const path = require("path");

const log = require("../log").default.namespace("core");
const INFO = require("../info").default;
const config = require("../config").default;
const { walk } = require("../util/files");
const { timeout } = require("../util/promises");
const helpToJSON = require("../util/commands/helpToJSON").default;
const nanoTimer = require("../modules/timer").default;
const random = require("../modules/random/random").default;
const calendar_events = require("../modules/calendar/events").default;

const CommandProcessor = require("./CommandProcessor");

const DatabaseManager = require("./managers/DatabaseManager").default;
const CM = require("./managers/ConfigManager");
const LocaleManager = require("./managers/LocaleManager").default;
const WebsiteManager = require("./managers/WebsiteManager");
const UpvotesManager = require("./managers/UpvotesManager");
const MemberLog = require("./listeners/MemberLog");

const Discord = require("discord.js");

const CommandScope = require("../util/commands/CommandScope").default;
const AliasCommand = require("./commands/AliasCommand");
const Translation = require("../modules/i18n/Translation").default;

const BotListManager = require("./managers/BotListManager").default;

class Core {
    /**
     * @param {Discord.Client} client
     * @param {Db} db
     */
    constructor(client, db) {
        this.client = client;
        this.db = new DatabaseManager(db);

        this.config = new CM(this.client, this.db, [
            new CM.Parameter("prefix", new Translation("config.prefix", "❗ Prefix"), config.get("prefix") || "!", String),

            new CM.Parameter("uom", new Translation("config.uom", "📐 Measurement preference"), "cm", ["cm", "in"]),

            new CM.Parameter([
                new CM.Parameter("announce.channel", new Translation("config.announce_ch", "Channel. 'none' disables announcements"), null, Discord.TextChannel, true),
                new CM.Parameter("announce.bots", new Translation("config.announce_bot", "Announce Bots"), true, Boolean),
            ], new Translation("config.announce", "🔔 Announce new/leaving/banned users")),

            new CM.Parameter([
                new CM.Parameter("welcome.enabled", "true/false", false, Boolean),
                new CM.Parameter("welcome.text", new Translation("config.text", "Custom Text ('{{user}}' as user, empty = default)"), null, String, true),
            ], new Translation("config.welcome", "👋 Announce new users")),

            new CM.Parameter([
                new CM.Parameter("leave.enabled", "true/false", false, Boolean),
                new CM.Parameter("leave.text", new Translation("config.text", "Custom Text ('{{user}}' as user, empty = default)"), null, String, true),
            ], new Translation("config.leave", "🚶 Announce leaving users")),

            new CM.Parameter([
                new CM.Parameter("ban.enabled", "true/false", false, Boolean),
                new CM.Parameter("ban.text", new Translation("config.text", "Custom Text ('{{user}}' as user, empty = default)"), null, String, true),
            ], new Translation("config.ban", "🔨 Announce banned users")),
        ]);

        this.locale = new LocaleManager(this.client, this.db);

        this.processor = new CommandProcessor(this.client, this.config, this.locale, this.db);
        this.website = new WebsiteManager(this.processor.REGISTRY, this.client, this.config, this.locale, this.db);
        this.upvotes = new UpvotesManager(this.client, this.db);

        this.member_log = new MemberLog(this.client, this.config, this.locale);

        this.botlist = new BotListManager(this.client);
    }

    /**
     * @param {string} commands_package
     */
    async init(commands_package) {
        if (this.client.voice) for (const voice of this.client.voice.connections.values()) voice.disconnect();

        await this.loadCommands(commands_package);
        await this.attachListeners();
        await this.setStatus();

        if (!INFO.DEV) this.botlist.init();
    }

    /**
     * @param {string} commands_package
     */
    async loadCommands(commands_package) {
        if (!commands_package || typeof commands_package !== "string")
            throw new Error("Cannot load commands if not given a path to look at!");

        log("Installing Commands...");

        const timer = nanoTimer();

        const files = await walk(commands_package)
            .then(files => files.filter(file => path.extname(file) === ".js"));

        const install_opts = {
            client: this.client,
            config: this.config, locale: this.locale, db: this.db, error_cases: this.processor.error_cases,
        };
        await Promise.all(files.map(async file => {
            log.debug(file, "installing...");
            const time = nanoTimer();
            const install = require(file);
            await install(this.processor.REGISTRY, install_opts);
            log.debug(file, "installed.", nanoTimer.diffMs(time).toFixed(3), "ms");
        }));

        const install_time = nanoTimer.diff(timer) / nanoTimer.NS_PER_SEC;

        log("Building commands.json");

        const jason = {
            prefix: this.config.default_config.prefix,
            commands: [],
        };

        for (const [name, cmd] of this.processor.REGISTRY.commands) {
            if (cmd instanceof AliasCommand) continue;
            if (!cmd.help) continue;
            if (!cmd.scope.has(CommandScope.FLAGS.GUILD)) continue;
            jason.commands.push({
                name,
                help: helpToJSON(this.config.default_config, name, cmd),
            });
        }

        // by sorting we're getting around an always different order of commands, which
        // confuses git
        jason.commands = jason.commands.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });

        const var_dir = path.join(process.cwd(), ".var");
        const src = path.join(var_dir, "commands.json");
        const dest = path.join(process.cwd(), "..", "trixieweb", "client", "src", "assets", "commands.json");

        if (!(await fs.pathExists(var_dir))) await fs.mkdir(var_dir);
        await fs.writeFile(src, JSON.stringify(jason, null, 2));
        await fs.copy(src, dest, { overwrite: true });

        const build_time = (nanoTimer.diff(timer) / nanoTimer.NS_PER_SEC) - install_time;

        log(`Commands installed. files:${files.length} commands:${this.processor.REGISTRY.commands.size} install_time:${install_time.toFixed(3)}s build_time:${build_time.toFixed(3)}s`);
    }

    attachListeners() {
        this.client.addListener("message", message => this.processor.onMessage(message));
    }

    async setStatus() {
        let timeout_ref = null;

        const txt = await fs.readFile(path.join(process.cwd(), "assets/text/statuses.txt"), "utf8");
        const statuses = txt.split("\n").filter(s => s !== "");

        const updateStatus = async () => {
            clearTimeout(timeout_ref);
            timeout_ref = setTimeout(updateStatus, 3 * 60000);

            this.client.user.setStatus("online");

            // Server count

            this.client.user.setActivity(`!trixie | ${this.client.guilds.cache.size.toLocaleString("en")} servers`, { type: "WATCHING" });

            await timeout(60000);

            // Website

            this.client.user.setActivity("!trixie | trixie.loneless.art", { type: "PLAYING" });

            await timeout(60000);

            // Status text

            let status = null;
            for (const event of calendar_events) {
                if (!event.isToday()) continue;

                status = event.getStatus();
                break;
            }

            status = status || random(statuses);

            this.client.user.setActivity(`!trixie | ${status}`, { type: "PLAYING" });
        };

        for (let event of calendar_events) {
            event.on("start", updateStatus).on("end", updateStatus);
        }

        updateStatus();
    }
}

module.exports = Core;
