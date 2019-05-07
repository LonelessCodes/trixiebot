const cpc = require("../../modules/cpc");
const respawn = require("../../modules/respawn");
const path = require("path");
const uuid = require("uuid/v1");
const BSON = require("bson");
const CustomCommand = require("../../class/CustomCommand");

const TYPE = Object.freeze({
    COMMAND: 0,
    STARTS_WITH: 1,
    CONTAINS: 2,
    REGEX: 3,
    EXACT_MATCH: 4
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
     */
    async test(command_name, prefix_used, raw_content) {
        switch (this.type) {
            case TYPE.COMMAND:
                if (prefix_used)
                    if (this.case_sensitive) return command_name === this.trigger;
                    else return command_name.toLowerCase() === this.trigger.toLowerCase();
                break;
            case TYPE.STARTS_WITH:
                if (this.case_sensitive) return raw_content.startsWith(this.trigger);
                else return raw_content.toLowerCase().startsWith(this.trigger.toLowerCase());
            case TYPE.CONTAINS:
                if (this.case_sensitive) return raw_content.includes(this.trigger);
                else return raw_content.toLowerCase().includes(this.trigger.toLowerCase());
            case TYPE.REGEX:
                if (this.case_sensitive) return new RegExp(this.trigger, "").exec(raw_content);
                else return new RegExp(this.trigger, "gi").test(raw_content);
            case TYPE.EXACT_MATCH:
                if (this.case_sensitive) return raw_content === this.trigger;
                else return raw_content.toLowerCase() === this.trigger.toLowerCase();
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
    constructor(row) {
        return {
            id: row.id,
            enabled: row.enabled,
            type: row.type,
            trigger: row.trigger,
            case_sensitive: row.case_sensitive,
            code: row.code,
            compile_errors: row.compile_errors,
            runtime_errors: row.runtime_errors,
            disabled_channels: row.disabled_channels,
            created_at: row.created_at,
            modified_at: row.modified_at
        };
    }
}

class CCManager {
    constructor(client, database) {
        this.client = client;
        this.database = database.collection("custom_commands");
        this.database.createIndex({ id: 1 }, { unique: true });

        const dir = path.join(__dirname, "custom_commands");
        const file = path.join(dir, "worker.js");
        this.fork = respawn([file], { cwd: dir, fork: true, env: process.env }).restart();
        this.cpc = cpc(this.fork);
        this.cpc.addListener("ready", () => {
            console.log("custom commands ready");
        });

        /** @type {Map<string, Trigger[]} */
        this.trigger_cache = new Map;
    }

    async get(guild, { command_name, prefix_used, rawContent: raw_content }) {
        const guildId = guild.id;
        if (!this.trigger_cache.has(guildId)) {
            const rows = await this.database.find({ guildId, enabled: true }, { type: 1, trigger: 1, id: 1, case_sensitive: 1 }).toArray();

            const triggers = [];
            for (let row of rows) {
                triggers.push(new Trigger(this, row.type, row.trigger, row.case_sensitive, row.id));
            }
            this.trigger_cache.set(guildId, triggers);
        }

        const triggers = this.trigger_cache.get(guildId);
        for (let trigger of triggers) {
            if (!(await trigger.test(command_name, prefix_used, raw_content))) continue;

            return await trigger.getCommand();
        }
    }

    async compile(code) {
        const { errors, cst } = await this.cpc.awaitAnswer("compile", { code });
        return { errors, cst };
    }

    async getCommandsForWeb(guildId) {
        const rows = await this.database.find({ guildId }, {
            id: 1, enabled: 1, type: 1, trigger: 1, case_sensitive: 1, code: 1, disabled_channels: 1, created_at: 1, modified_at: 1, compile_errors: 1, runtime_errors: 1
        }).toArray();

        return rows.map(row => new WebCommand(row));
    }

    async addCommand(guildId, conf = { type: 0, trigger: "", case_sensitive: false, code: "", disabled_channels: [] }) {
        const { type, trigger, case_sensitive, code, disabled_channels } = conf;

        // TODO: outsource these checks to the website instance
        if (typeof type !== "number" || type < 0 || type >= Object.getOwnPropertyNames(TYPE).length) throw "Trigger type out of range";
        if (typeof trigger !== "string" || trigger.length === 0 || trigger.length > 128) throw "Trigger out of range";
        if (typeof case_sensitive !== "boolean") throw "case_sensitive not a boolean";
        if (typeof code !== "string" || code.length === 0 || code.length > 10000) throw "Code out of range";
        if (!Array.isArray(disabled_channels) || disabled_channels.some(c => typeof c !== "string")) throw "Disabled channels out of range";

        const { errors: compile_errors, cst } = await this.compile(code);

        const created_at = new Date;
        const enabled = true;
        const id = uuid();

        const row = {
            id,
            guildId,
            type, trigger, case_sensitive,
            code, cst: cst ? BSON.serialize(cst) : null, compile_errors, runtime_errors: [],
            disabled_channels,
            enabled,
            created_at, modified_at: null,
        };

        await this.database.insertOne(row);

        row.cst = new BSON.Binary(row.cst);

        if (this.trigger_cache.has(guildId)) {
            const trig = new Trigger(this, type, trigger, case_sensitive, row.id);
            trig._command = new CustomCommand(this, row);

            this.trigger_cache.get(guildId).push(trig);
        }

        return new WebCommand(row);
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

        if (this.trigger_cache.has(guildId)) {
            const trig = this.trigger_cache.get(guildId).find(trig => trig.id === id);
            trig.case_sensitive = doc.case_sensitive;
            trig.trigger = doc.trigger;
            trig.type = doc.type;
            if (trig._command) {
                doc.cst = new BSON.Binary(doc.cst);
                trig._command.update(doc);
                return new WebCommand(trig._command);
            }
        }

        return new WebCommand(doc);
    }

    async enableCommand(guildId, id, enabled) {
        await this.database.updateOne({ guildId, id }, { $set: { enabled } });

        if (this.trigger_cache.has(guildId)) {
            const triggers = this.trigger_cache.get(guildId);
            if (!enabled) {
                const index = triggers.findIndex(trig => trig.id === id);
                if (index >= 0) triggers.splice(index, 1);
            } else if (!triggers.some(trig => trig.id === id)) {
                const row = await this.database.findOne({ guildId, id }, { type: 1, trigger: 1, id: 1, case_sensitive: 1 });
                triggers.push(new Trigger(this, row.type, row.trigger, row.case_sensitive, row.id));
            }
        }

        return enabled;
    }

    async removeCommand(guildId, id) {
        await this.database.deleteOne({ guildId, id });

        if (this.trigger_cache.has(guildId)) {
            const triggers = this.trigger_cache.get(guildId);
            const index = triggers.findIndex(trig => trig.id === id);
            if (index >= 0) triggers.splice(index, 1);
        }
    }
}

module.exports = CCManager;