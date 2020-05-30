/*
 * Copyright (C) 2020 Christian Schäfer / Loneless
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

import Discord from "discord.js";

import fetch, { RequestInit, FetchError } from "node-fetch";
import { JsonObject } from "type-fest";

const log = require("../../log").default.namespace("botlist stats");
import config from "../../config";

function catchReject(name: string) {
    return (err: FetchError) => {
        log.error("%s:", name, "reject:", err);
    };
}
function catchResolve(name: string) {
    return () => {
        log("%s:", name, "success");
    };
}

export default class BotListManager {
    public client: Discord.Client;

    constructor(client: Discord.Client) {
        this.client = client;
    }

    init() {
        this._updateStatistics();
        setInterval(() => this._updateStatistics(), 3600 * 1000);
    }

    private _updateStatistics() {
        if (!this.client.user) return;

        const id = this.client.user.id;
        const server_count = this.client.guilds.cache.size;

        if (config.has("botlists.divinediscordbots_com"))
            BotListManager.post(`https://divinediscordbots.com/bot/${id}/stats`, {
                json: { server_count },
                headers: {
                    Authorization: config.get("botlists.divinediscordbots_com"),
                },
            }).then(catchResolve("divinediscordbots_com")).catch(catchReject("divinediscordbots_com"));

        if (config.has("botlists.botsfordiscord_com"))
            BotListManager.post(`https://botsfordiscord.com/api/bot/${id}`, {
                json: { server_count },
                headers: {
                    Authorization: config.get("botlists.botsfordiscord_com"),
                },
            }).then(catchResolve("botsfordiscord_com")).catch(catchReject("botsfordiscord_com"));

        if (config.has("botlists.discord_bots_gg"))
            BotListManager.post(`https://discord.bots.gg/api/v1/bots/${id}/stats`, {
                json: { guildCount: server_count },
                headers: {
                    Authorization: config.get("botlists.discord_bots_gg"),
                },
            }).then(catchResolve("discord_bots_gg")).catch(catchReject("discord_bots_gg"));

        if (config.has("botlists.botlist_space"))
            BotListManager.post(`https://botlist.space/api/bots/${id}`, {
                json: { server_count },
                headers: {
                    Authorization: config.get("botlists.botlist_space"),
                },
            }).then(catchResolve("botlist_space")).catch(catchReject("botlist_space"));

        if (config.has("botlists.terminal_ink"))
            BotListManager.post(`https://ls.terminal.ink/api/v2/bots/${id}`, {
                json: { bot: { count: server_count } },
                headers: {
                    Authorization: config.get("botlists.terminal_ink"),
                },
            }).then(catchResolve("terminal_ink")).catch(catchReject("terminal_ink"));

        if (config.has("botlists.discordbotlist_com"))
            BotListManager.post(`https://discordbotlist.com/api/v1/bots/${id}/stats`, {
                json: {
                    guilds: server_count,
                    users: this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0),
                    voice_connections: this.client.voice?.connections.size || 0,
                },
                headers: {
                    Authorization: config.get("botlists.discordbotlist_com"),
                },
            }).then(catchResolve("discordbotlist_com")).catch(catchReject("discordbotlist_com"));

        if (config.has("botlists.discordbots_org"))
            BotListManager.post(`https://top.gg/api/bots/${id}/stats`, {
                json: { server_count },
                headers: {
                    Authorization: config.get("botlists.discordbots_org"),
                },
            }).then(catchResolve("discordbots_org")).catch(catchReject("discordbots_org"));
    }

    static post(url: string, opts: RequestInit & { json?: JsonObject }) {
        if (opts.json) {
            opts.body = JSON.stringify(opts.json);
            delete opts.json;
        }
        return fetch(url, {
            method: "POST", ...opts,
            headers: {
                "Content-Type": "application/json",
                ...(opts.headers || {}),
            },
        });
    }
}
