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

import path from "path";
import { Db } from "mongodb";
import Discord from "discord.js";

const log = require("../log").default.namespace("core");
import INFO from "../info";
import config from "../config";
import { walk } from "../util/files";
import nanoTimer from "../modules/timer";

import CommandProcessor from "./CommandProcessor";

import DatabaseManager from "./managers/DatabaseManager";
import CM from "./managers/ConfigManager";
import LocaleManager from "./managers/LocaleManager";
import WebsiteManager from "./managers/WebsiteManager";
// import UpvotesManager from "./managers/UpvotesManager";
import MemberLog from "./listeners/MemberLog";

import BotStatsManager, { MESSAGES_TODAY, COMMANDS_EXECUTED } from "./managers/BotStatsManager";
import GuildStatsManager from "./managers/GuildStatsManager";
import Translation from "../modules/i18n/Translation";

import BotListManager from "./managers/BotListManager";
import PresenceStatusManager from "./managers/PresenceStatusManager";
import ErrorCaseManager from "./managers/ErrorCaseManager";
import CommandRegistry from "./CommandRegistry";

export interface CmdInstallerArgs {
    client: Discord.Client;
    config: CM;
    locale: LocaleManager;
    db: Db;
    error_cases: ErrorCaseManager;
    presence_status: PresenceStatusManager;
    bot_stats: BotStatsManager;
    guild_stats: GuildStatsManager;
}

export type CmdInstallerFileFunc = (cr: CommandRegistry, opts: CmdInstallerArgs) => (Promise<void> | void);
export type CmdInstallerFile =
    CmdInstallerFileFunc
    & { default: CmdInstallerFileFunc; }
    & { install: CmdInstallerFileFunc; };

export default class Core {
    client: Discord.Client;
    db: Db;
    config: CM;
    locale: LocaleManager;
    bot_stats: BotStatsManager;
    guild_stats: GuildStatsManager;
    processor: CommandProcessor;
    website: WebsiteManager;
    // upvotes: UpvotesManager;
    member_log: MemberLog;
    botlist: BotListManager;
    presence_status: PresenceStatusManager;

    constructor(client: Discord.Client, db: Db) {
        this.client = client;
        // TODO: Unbedingt das mit dem DatabaseManager fixen
        this.db = new DatabaseManager(db) as unknown as Db;

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

        this.bot_stats = new BotStatsManager(this.db);
        this.guild_stats = new GuildStatsManager(this.db);

        this.processor = new CommandProcessor(this.client, this.config, this.locale, this.bot_stats, this.guild_stats, this.db);
        this.website = new WebsiteManager(this.processor.REGISTRY, this.client, this.config, this.locale, this.guild_stats, this.db);
        // this.upvotes = new UpvotesManager(this.client, this.db);

        this.member_log = new MemberLog(this.client, this.config, this.locale, this.bot_stats, this.guild_stats);

        this.botlist = new BotListManager(this.client);
        this.presence_status = new PresenceStatusManager(this.client, this.db);
    }

    async init(commands_package: string): Promise<void> {
        if (this.client.voice) for (const voice of this.client.voice.connections.values()) voice.disconnect();

        await this.bot_stats.load(COMMANDS_EXECUTED);
        await this.bot_stats.load(MESSAGES_TODAY);

        await this.loadCommands(commands_package);

        await this.presence_status.init();
        if (!INFO.DEV) this.botlist.init();

        this.attachListeners();
    }

    async loadCommands(commands_package: string): Promise<void> {
        if (!commands_package || typeof commands_package !== "string")
            throw new Error("Cannot load commands if not given a path to look at!");

        log("Installing Commands...");

        const timer = nanoTimer();

        const files = await walk(commands_package)
            .then(files => files.filter(file => {
                const ext = path.extname(file);
                return ext === ".js" || ext === ".ts";
            }));

        const install_opts: CmdInstallerArgs = {
            client: this.client,
            config: this.config, locale: this.locale, db: this.db, error_cases: this.processor.error_cases,
            presence_status: this.presence_status, bot_stats: this.bot_stats, guild_stats: this.guild_stats,
        };
        await Promise.all(files.map(async file => {
            log("%s: installing...", file);
            const time = nanoTimer();

            const install = require(file) as CmdInstallerFile;
            if (typeof install.default === "function") await install.default(this.processor.REGISTRY, install_opts);
            else if (typeof install.install === "function") await install.install(this.processor.REGISTRY, install_opts);
            else await install(this.processor.REGISTRY, install_opts);

            log("%s: installed. %s ms", file, nanoTimer.diffMs(time).toFixed(3));
        }));

        const install_time = nanoTimer.diff(timer) / nanoTimer.NS_PER_SEC;

        log(`Commands installed. files:${files.length} commands:${this.processor.REGISTRY.commands.size} install_time:${install_time.toFixed(3)}s`);
    }

    attachListeners(): void {
        this.client.addListener("message", message => this.processor.onMessage(message));
    }
}
