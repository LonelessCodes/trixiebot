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

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const CommandScope = require("../util/commands/CommandScope").default;

const log = require("../log").default;
const { doNothing } = require("../util/util");
const config = require("../config").default;

const fetch = require("node-fetch").default;
const base_url = "https://cleverbot.io/1.0/";

class CleverbotError extends Error {}

class Session {
    /**
     * Creates a new cleverbot session
     * @param {Cleverbot} client
     * @param {string} nick
     */
    constructor(client, nick) {
        this.client = client;
        this.nick = nick;
    }

    /**
     * @param {string} input
     */
    async ask(input) {
        const body = new URLSearchParams();
        body.append("user", this.client.user);
        body.append("key", this.client.key);
        body.append("nick", this.nick);
        body.append("text", input);

        const req = await fetch(base_url + "ask", {
            method: "POST",
            body,
        });
        const json = await req.json();

        if (json.status == "success") return json.response;
        throw new CleverbotError(json.status);
    }
}

class Cleverbot {
    /**
     * Creates a new Cleverbot API instance
     * @param {string} user
     * @param {string} key
     */
    constructor(user, key) {
        this.user = user;
        this.key = key;
        /** @type {Set<string>} */
        this._cache = new Set();
    }

    /**
     * @param {string} nick your session id. Creates new session id if non-existant
     */
    async create(nick) {
        if (this._cache.has(nick)) {
            return new Session(this, nick);
        }

        const params = new URLSearchParams();
        params.append("user", this.user);
        params.append("key", this.key);
        params.append("nick", nick);

        const req = await fetch(base_url + "create", {
            method: "POST",
            body: params,
        });
        const json = await req.json();

        /** @type {string} */
        let status;

        try {
            status = json.status;
        } catch (e) {
            status = "API endpoints unreachable";
        }

        if (status == "success") {
            nick = json.nick;
            this._cache.add(nick);
            return new Session(this, nick);
        } else if (status == "Error: reference name already exists") {
            this._cache.add(nick);
            return new Session(this, nick);
        }
        throw new CleverbotError(status);
    }
}

module.exports = function install(cr) {
    if (!config.has("cleverbot.user") || !config.has("cleverbot.key"))
        return log.namespace("config", "Found no API credentials for Cleverbot.io - Disabled chat command");

    const bot = new Cleverbot(config.get("cleverbot.user"), config.get("cleverbot.key"));

    cr.registerCommand("chat", new OverloadCommand())
        .registerOverload(
            "1+",
            new SimpleCommand(async ({ message, content: input }) => {
                message.channel.startTyping().catch(doNothing);

                try {
                    const session = await bot.create(message.author.id);

                    const reply = await session.ask(input);

                    if (message.channel.type === "text") await message.channel.send(`${message.member.toString()} ${reply}`);
                    else await message.channel.send(`${message.author.toString()} ${reply}`);
                } finally {
                    message.channel.stopTyping();
                }
            })
        )
        .setHelp(new HelpContent().setUsage("<text>", "Talk with Trixie1!!! (using a cleverbot integration)"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);

    cr.registerAlias("chat", "cleverbot");
};
