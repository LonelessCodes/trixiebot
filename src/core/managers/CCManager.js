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

const { respawn, ChildProcessLayer } = require("@trixiebot/ipc");
const nanoTimer = require("../../modules/timer").default;
const log = require("../../log").default.namespace("cc manager");
const path = require("path");
const { v1: uuid } = require("uuid");
const BSON = require("bson");
const CustomCommand = require("../commands/CustomCommand").default;
const WorkerMethods = require("./cc_utils/WorkerMethods");
// eslint-disable-next-line no-unused-vars
const MessageContext = require("../../util/commands/MessageContext").default;

const TYPE = Object.freeze({
    COMMAND: 0,
    STARTS_WITH: 1,
    CONTAINS: 2,
    REGEX: 3,
    EXACT_MATCH: 4,
});

class Trigger {
    constructor(manager, type, trigger, case_sensitive, id) {
        /** @type {CCManager} */
        this.manager = manager;
        /** @type {number} */
        this.type = type;
        /** @type {string} */
        this.trigger = trigger;
        /** @type {boolean} */
        this.case_sensitive = case_sensitive;
        /** @type {string} */
        this.id = id;

        this._command = null;
    }

    /**
     * @param {string} command_name
     * @param {boolean} prefix_used
     * @param {string} raw_content
     * @returns {boolean}
     */
    test(command_name, prefix_used, raw_content) {
        switch (this.type) {
            case TYPE.COMMAND:
                if (prefix_used)
                    if (this.case_sensitive) return command_name === this.trigger;
                    else return command_name.toLowerCase() === this.trigger.toLowerCase();
                break;
            case TYPE.STARTS_WITH:
                if (this.case_sensitive) return raw_content.startsWith(this.trigger);
                return raw_content.toLowerCase().startsWith(this.trigger.toLowerCase());
            case TYPE.CONTAINS:
                if (this.case_sensitive) return raw_content.includes(this.trigger);
                return raw_content.toLowerCase().includes(this.trigger.toLowerCase());
            case TYPE.REGEX:
                if (this.case_sensitive) return new RegExp(this.trigger, "").test(raw_content);
                return new RegExp(this.trigger, "gi").test(raw_content);
            case TYPE.EXACT_MATCH:
                if (this.case_sensitive) return raw_content === this.trigger;
                return raw_content.toLowerCase() === this.trigger.toLowerCase();
        }

        return false;
    }

    async getCommand() {
        if (!this._command) {
            const row = await this.manager.database.findOne({ id: this.id });
            this._command = new CustomCommand(this.manager, row);
        }
        return this._command;
    }
}

class WebCommand {
    constructor(row, unread_errors = 0) {
        return {
            id: row.id,
            enabled: row.enabled,
            type: row.type,
            trigger: row.trigger,
            case_sensitive: row.case_sensitive,
            code: row.code,
            compile_errors: row.compile_errors,
            unread_errors,
            disabled_channels: row.disabled_channels,
        };
    }
}

class CCManager {
    constructor(client, database) {
        this.client = client;

        this.database = database.collection("custom_commands");
        this.database.createIndex({ id: 1 }, { unique: true });
        this.database.createIndex({ guildId: 1, type: 1, trigger: 1, case_sensitive: 1 }, { unique: true });

        this.errors_db = database.collection("cc_errors");
        this.errors_db.createIndex({ ts: 1 });

        this.settings_db = database.collection("cc_settings");
        this.settings_db.createIndex({ guildId: 1 }, { unique: true });

        log("Starting worker");
        const timer = nanoTimer();

        const dir = path.join(__dirname, "cc_worker");
        const file = path.join(dir, "worker.js");
        this.fork = respawn(file, { cwd: dir, fork: true, env: process.env })
            .restart()
            .addListener("ready", () => {
                const time = nanoTimer.diff(timer) / nanoTimer.NS_PER_MS;
                log(`Worker ready. boot_time:${time.toFixed(1)}ms`);
            });
        this.cpc = new ChildProcessLayer(this.fork);

        this.worker_methods = new WorkerMethods(this.client, this.cpc);

        /** @type {Map<string, Trigger[]>} */
        this.trigger_cache = new Map();
    }

    /*
     * Regular methods
     */

    async get(guild, { command_name, prefix_used, raw_content }) {
        const guildId = guild.id;
        if (!this.trigger_cache.has(guildId)) {
            const rows = await this.database
                .find({ guildId, enabled: true }, { type: 1, trigger: 1, id: 1, case_sensitive: 1 })
                .toArray();

            const triggers = [];
            for (const row of rows) {
                triggers.push(new Trigger(this, row.type, row.trigger, row.case_sensitive, row.id));
            }
            this.trigger_cache.set(guildId, triggers);
        }

        const triggers = this.trigger_cache.get(guildId);
        // first check against commands
        for (const trigger of triggers.filter(t => t.type === TYPE.COMMAND)) {
            if (!(await trigger.test(command_name, prefix_used, raw_content))) continue;

            return await trigger.getCommand();
        }
        // then check against anything else
        for (const trigger of triggers.filter(t => t.type !== TYPE.COMMAND)) {
            if (!(await trigger.test(command_name, prefix_used, raw_content))) continue;

            return await trigger.getCommand();
        }
    }

    /**
     * @param {MessageContext} context
     * @param {Object} opts
     */
    async run(context, opts) {
        this.worker_methods.setMessage(context.message);

        let response;
        let error;
        try {
            response = await this.cpc.awaitAnswer("run", opts);
        } catch (err) {
            error = err;
        }

        this.worker_methods.message_cache.delete(context.guild.id);

        if (error) throw error;
        return response;
    }

    async compile(code) {
        const { errors, cst } = await this.cpc.awaitAnswer("compile", { code });
        return { errors, cst };
    }

    async getCommands(guildId, channelId) {
        const query = { guildId, enabled: true, type: TYPE.COMMAND };
        if (channelId)
            query.disabled_channels = {
                $not: {
                    $all: [channelId],
                },
            };

        return await this.database.find(query).toArray();
    }

    /*
     * Web stuff
     */

    async getCommandsForWeb(guildId) {
        const rows = await this.database.find({ guildId }).toArray();
        const errors = new Map();
        for (const row of rows) {
            const err = await this.errors_db
                .find({ commandId: row.id, ts: { $gt: row.last_read } })
                .count()
                .catch(() => 0);
            errors.set(row.id, err);
        }

        return rows
            .sort((a, b) => {
                const bmod = b.modified_at || b.created_at;
                const amod = a.modified_at || a.created_at;
                if (bmod < amod) return -1;
                if (bmod > amod) return 1;
                return 0;
            })
            .map(row => new WebCommand(row, errors.get(row.id)));
    }

    async getSettings(guildId) {
        const settings = {
            allowed_roles: [],
            ...(await this.settings_db.findOne({ guildId })),
        };

        return {
            allowed_roles: settings.allowed_roles,
        };
    }

    async updateSettings(guildId, settings) {
        await this.settings_db.updateOne({ guildId }, { $set: { ...settings } }, { upsert: true });

        return {
            allowed_roles: settings.allowed_roles,
        };
    }

    async addCommand(guildId, conf = { type: 0, trigger: "", case_sensitive: false, code: "", disabled_channels: [] }) {
        const { type, trigger, case_sensitive, code, disabled_channels } = conf;

        const { errors: compile_errors, cst } = await this.compile(code);

        const created_at = new Date;
        const enabled = true;
        const id = uuid();

        const row = {
            id,
            guildId,
            type,
            trigger,
            case_sensitive,
            use_trixiescript: true,
            replies: [],
            code,
            cst: cst ? BSON.serialize(cst) : null,
            compile_errors,
            last_read: new Date(),
            disabled_channels,
            enabled,
            created_at,
            modified_at: null,
        };

        await this.database.insertOne(row);

        row.cst = new BSON.Binary(row.cst);

        if (this.trigger_cache.has(guildId)) {
            const trig = new Trigger(this, type, trigger, case_sensitive, row.id);
            trig._command = new CustomCommand(this, row);

            this.trigger_cache.get(guildId).push(trig);
        }

        return new WebCommand(row, 0);
    }

    async hasCommand(guildId, commandId) {
        const row = await this.database.findOne({ guildId, id: commandId });
        return !!row;
    }

    async updateCommand(guildId, id, conf = { type: 0, trigger: "", case_sensitive: false, code: "", disabled_channels: [] }) {
        let doc = {};
        doc.type = conf.type;
        doc.trigger = conf.trigger;
        doc.case_sensitive = conf.case_sensitive;
        doc.disabled_channels = conf.disabled_channels;

        doc.code = conf.code;
        const { errors: compile_errors, cst } = await this.compile(conf.code);
        doc.compile_errors = compile_errors;
        doc.cst = cst ? BSON.serialize(cst) : null;

        doc.modified_at = new Date;

        const row = await this.database.findOneAndUpdate({ guildId, id }, { $set: doc });
        doc = Object.assign(row.value, doc);
        const errs = await this.errors_db.find({ commandId: doc.id, ts: { $gt: doc.last_read } }).count().catch(() => 0);

        if (this.trigger_cache.has(guildId)) {
            const trig = this.trigger_cache.get(guildId).find(trig => trig.id === id);
            trig.case_sensitive = doc.case_sensitive;
            trig.trigger = doc.trigger;
            trig.type = doc.type;
            if (trig._command) {
                doc.cst = new BSON.Binary(doc.cst);
                trig._command.update(doc);
                return new WebCommand(trig._command, errs);
            }
        }

        return new WebCommand(doc, errs);
    }

    async enableCommand(guildId, id, enabled) {
        const { value: row } = await this.database.findOneAndUpdate({ guildId, id }, { $set: { enabled } });

        if (this.trigger_cache.has(guildId)) {
            const triggers = this.trigger_cache.get(guildId);
            if (!enabled) {
                const index = triggers.findIndex(trig => trig.id === id);
                if (index >= 0) triggers.splice(index, 1);
            } else if (!triggers.some(trig => trig.id === id)) {
                triggers.push(new Trigger(this, row.type, row.trigger, row.case_sensitive, row.id));
            }
        }

        return enabled;
    }

    async removeCommand(guildId, id) {
        await this.database.deleteOne({ guildId, id });
        await this.errors_db.deleteMany({ guildId, commandId: id });

        if (this.trigger_cache.has(guildId)) {
            const triggers = this.trigger_cache.get(guildId);
            const index = triggers.findIndex(trig => trig.id === id);
            if (index >= 0) triggers.splice(index, 1);
        }
    }

    async getErrors(guildId, id) {
        const row = await this.database.findOneAndUpdate({ guildId, id }, { $set: { last_read: new Date } });
        if (!row) return;
        const errs = await this.errors_db.find({ commandId: id }, { _id: 0 }).toArray();
        return errs.sort((a, b) => {
            const bts = b.ts;
            const ats = a.ts;
            if (bts < ats) return -1;
            if (bts > ats) return 1;
            return 0;
        });
    }
}

module.exports = CCManager;
