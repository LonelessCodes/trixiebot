const cpc = require("../../modules/cpc");
const respawn = require("../../modules/respawn");
const path = require("path");
// const BSON = require("bson");
// const NanoTimer = require("../../modules/NanoTimer");
const CustomCommand = require("../../class/CustomCommand");

const TYPE = Object.freeze({
    COMMAND: 0,
    STARTS_WITH: 1,
    CONTAINS: 2,
    REGEX: 3,
    EXACT_MATCH: 4
});

class Trigger {
    constructor(manager, type, trigger, case_sensitive, _id) {
        /** @type {CCManager} */
        this.manager = manager;
        /** @type {number} */
        this.type = type;
        /** @type {string|RegExp} */
        this.trigger = trigger;
        /** @type {boolean} */
        this.case_sensitive = case_sensitive;
        /** @type {string} */
        this._id = _id;

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
                    if (this.case_sensitive && command_name === this.trigger) return true;
                    else if (command_name.toLowerCase() === this.trigger.toLowerCase()) return true;
                break;
            case TYPE.CONTAINS:
                if (this.case_sensitive && raw_content.includes(this.trigger)) return true;
                else if (raw_content.toLowerCase().includes(this.trigger.toLowerCase())) return true;
                break;
            case TYPE.EXACT_MATCH:
                if (this.case_sensitive && raw_content === this.trigger) return true;
                else if (raw_content.toLowerCase() === this.trigger.toLowerCase()) return true;
                break;
            case TYPE.REGEX:
                if (this.case_sensitive && new RegExp(this.trigger, "").exec(raw_content)) return true;
                else if (new RegExp(this.trigger, "i").exec(raw_content)) return true;
                break;
            case TYPE.STARTS_WITH:
                if (this.case_sensitive && raw_content.startsWith(this.trigger)) return true;
                else if (raw_content.toLowerCase().startsWith(this.trigger)) return true;
                break;
        }

        return false;
    }

    async getCommand() {
        if (!this._command) {
            const row = await this.manager.database.findOne({ _id: this._id });
            this._command = new CustomCommand(this.manager, row);
        }
        return this._command;
    }
}

class CCManager {
    constructor(client, database) {
        this.client = client;
        this.database = database.collection("custom_commands");

        const dir = path.join(__dirname, "custom_commands");
        const file = path.join(dir, "worker.js");
        this.fork = respawn([file], { cwd: dir, fork: true, env: process.env }).restart();
        this.cpc = cpc(this.fork);
        this.cpc.addListener("ready", () => {
            console.log("custom commands ready");
            this.start();
        });

        /** @type {Map<string, Trigger[]} */
        this.trigger_cache = new Map;
    }

    async get(guild, { command_name, prefix_used, rawContent: raw_content }) {
        const guildId = guild.id;
        if (!this.trigger_cache.has(guildId)) {
            const rows = await this.database.find({ guildId, disabled: false }, { type: 1, trigger: 1, _id: 1, case_sensitive: 1 }).toArray();

            const triggers = [];
            for (let row of rows) {
                triggers.push(new Trigger(this, row.type, row.trigger, row.case_sensitive, row._id));
            }
            this.trigger_cache.set(guildId, triggers);
        }

        const triggers = this.trigger_cache.get(guildId);
        for (let trigger of triggers) {
            if (!(await trigger.test(command_name, prefix_used, raw_content))) continue;

            return await trigger.getCommand();
        }
    }

    async start() {
        // const commandId = "test";
        // const text = require("fs").readFileSync(path.join(__dirname, "custom_commands/example.trixie"), "utf8");
        // const { cst, errors } = await this.cpc.awaitAnswer("compile", { text });
        // const timer = new NanoTimer().begin();
        // const { error, reply } = await this.cpc.awaitAnswer("run", { id: commandId, text, cst, message });
        // const errs = error ? [...errors, error] : errors;

        // await this.database.insertOne({
        //     guildId: "397369538196406273",
        //     type: TYPE.COMMAND,
        //     trigger: "test",
        //     case_sensitive: false,
        //     code: text,
        //     cst: BSON.serialize(cst),
        //     errors: errs,
        //     created_at: new Date,
        //     modified_at: new Date,
        //     created_by: "108391799185285120",
        //     disabled_channels: []
        // });

        // console.log(timer.end() / NanoTimer.NS_PER_SEC, errs, reply);
    }
}

module.exports = CCManager;