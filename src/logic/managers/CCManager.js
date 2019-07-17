const cpc = require("../../modules/cpc");
const respawn = require("../../modules/respawn");
const nanoTimer = require("../../modules/NanoTimer");
const log = require("../../modules/log").namespace("cc manager");
const path = require("path");
const uuid = require("uuid/v1");
const BSON = require("bson");
const CustomCommand = require("../../class/CustomCommand");
const Discord = require("discord.js");
const toEmoji = require("emoji-name-map");
const { Member, Channel, Emoji, Role, Message } = require("../cc_classes.js");

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
            disabled_channels: row.disabled_channels
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

        log("Starting worker");
        const timer = nanoTimer();

        const dir = path.join(__dirname, "cc_worker");
        const file = path.join(dir, "worker.js");
        this.fork = respawn([file], { cwd: dir, fork: true, env: process.env }).restart();
        this.cpc = cpc(this.fork);
        this.cpc.addListener("ready", () => {
            const time = timer.end() / nanoTimer.NS_PER_MS;
            log(`Worker ready. boot_time:${time.toFixed(1)}ms`);
        });

        this.attachListeners();

        /** @type {Map<string, Trigger[]} */
        this.trigger_cache = new Map;
        this.message_cache = new Map;
    }

    attachListeners() {
        this.cpc.answer("getEmoji", ({ emojiId, guildId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);
            if (!guild.emojis.has(emojiId)) return;
            return new Emoji(guild.emojis.get(emojiId));
        });

        this.cpc.answer("reaction.getMembers", async ({ messageId, reactionId, guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            const m = await this.getMessage(guild, messageId);
            if (!m) return [];

            if (!m.reactions.has(reactionId)) return [];
            const members = m.reactions.get(reactionId).members.array();

            return members.map(m => new Member(m));
        });

        this.cpc.answer("getMessage", async ({ messageId, guildId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            const m = await this.getMessage(guild, messageId);
            if (!m) return;

            return new Message(m);
        });

        this.cpc.answer("message.delete", async ({ messageId, guildId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            const m = await this.getMessage(guild, messageId);
            if (!m) return;

            if (m.author.id !== this.client.user.id || !m.channel.permissionsFor(guild.me).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
                return;

            await m.delete();
        });

        this.cpc.answer("message.edit", async ({ messageId, guildId, embed, content }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            const m = await this.getMessage(guild, messageId);
            if (!m) return;

            if (m.author.id !== this.client.user.id) return;

            let message;
            if (embed && content) {
                message = await m.edit(content, { embed: new Discord.RichEmbed(embed) });
            } else if (embed) {
                message = await m.edit({ embed: new Discord.RichEmbed(embed) });
            } else if (content) {
                message = await m.edit(content);
            }
            else message = m;

            this.setMessage(message);

            return new Message(message);
        });

        this.cpc.answer("message.react", async ({ messageId, guildId, emojis }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            const m = await this.getMessage(guild, messageId);
            if (!m) return;

            for (let emoji of emojis) {
                if (guild.emojis.has(emoji)) {
                    await m.react(guild.emojis.get(emoji)).catch(() => { });
                } else {
                    const e = toEmoji.get(emoji);
                    if (e) await m.react(e).catch(() => { });
                    else await m.react(emoji).catch(() => { });
                }
            }
        });

        this.cpc.answer("getRole", async ({ guildId, roleId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            if (!guild.roles.has(roleId)) return;
            return new Role(guild.roles.get(roleId));
        });

        this.cpc.answer("role.getMembers", async ({ guildId, roleId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            if (!guild.roles.has(roleId)) return [];
            const role = guild.roles.get(roleId);
            const members = role.members.array();

            return members.map(m => new Member(m));
        });

        this.cpc.answer("getMember", async ({ guildId, memberId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            if (!guild.members.has(memberId)) return;
            const member = guild.members.get(memberId);

            return new Member(member);
        });

        this.cpc.answer("member.getRoles", async ({ guildId, memberId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            if (!guild.members.has(memberId)) return [];
            const member = guild.members.get(memberId);
            const roles = member.roles.array();

            return roles.map(m => new Role(m));
        });

        this.cpc.answer("getChannel", async ({ guildId, channelId }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            if (!guild.channels.has(channelId)) return;
            const channel = guild.channels.get(channelId);

            return new Channel(channel);
        });

        this.cpc.answer("channel.createInvite", async ({ guildId, channelId, options }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            if (!guild.channels.has(channelId)) return;
            const channel = guild.channels.get(channelId);

            if (!channel.permissionsFor(guild.me).has(Discord.Permissions.FLAGS.CREATE_INSTANT_INVITE))
                return;

            try {
                const invite = await channel.createInvite(options);
                if (!invite) return;

                return invite.url;
            } catch (_) {
                return;
            }
        });

        this.cpc.answer("channel.send", async ({ guildId, channelId, content, embed }) => {
            if (!this.client.guilds.has(guildId)) return;
            const guild = this.client.guilds.get(guildId);

            if (!guild.channels.has(channelId)) return;
            const channel = guild.channels.get(channelId);

            let message;
            if (embed && content) {
                message = await channel.send(content, { embed: new Discord.RichEmbed(embed) });
            } else if (embed) {
                message = await channel.send({ embed: new Discord.RichEmbed(embed) });
            } else if (content) {
                message = await channel.send(content);
            }

            if (message) {
                this.setMessage(message);
                return new Message(message);
            }

            return;
        });

        this.cpc.answer("guild.getMembers", async ({ guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);
            const members = guild.members.array();

            return members.map(m => new Member(m));
        });

        this.cpc.answer("guild.getRoles", async ({ guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            const roles = guild.roles.array();

            return roles.map(m => new Role(m));
        });

        this.cpc.answer("guild.getChannels", async ({ guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            const channels = guild.channels.array().filter(c => c.type === "text");

            return channels.map(m => new Channel(m));
        });

        this.cpc.answer("guild.getEmojis", async ({ guildId }) => {
            if (!this.client.guilds.has(guildId)) return [];
            const guild = this.client.guilds.get(guildId);

            const emojis = guild.emojis.array();

            return emojis.map(m => new Emoji(m));
        });
    }

    setMessage(message) {
        const guild = message.guild;
        if (!this.message_cache.has(guild.id)) this.message_cache.set(guild.id, new Map);
        this.message_cache.get(guild.id).set(message.id, message);
    }

    async getMessage(guild, messageId) {
        if (this.message_cache.has(guild.id) && this.message_cache.get(guild.id).has(messageId)) {
            return this.message_cache.get(guild.id).get(messageId);
        }

        let channels = guild.channels.filter(c => c.type == "text").array();
        for (let current of channels) {
            let target = await current.fetchMessage(messageId);
            if (target) {
                this.setMessage(target);
                return target;
            }
        }
    }

    async get(guild, { command_name, prefix_used, raw_content }) {
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
        // first check against commands
        for (let trigger of triggers.filter(t => t.type === TYPE.COMMAND)) {
            if (!(await trigger.test(command_name, prefix_used, raw_content))) continue;

            return await trigger.getCommand();
        }
        // then check against anything else
        for (let trigger of triggers.filter(t => t.type !== TYPE.COMMAND)) {
            if (!(await trigger.test(command_name, prefix_used, raw_content))) continue;

            return await trigger.getCommand();
        }
    }

    async run(message, opts) {
        this.setMessage(message);

        let response;
        let error;
        try {
            response = await this.cpc.awaitAnswer("run", opts);
        } catch (err) {
            error = err;
        }

        this.message_cache.delete(message.guild.id);

        if (error) throw error;
        return response;
    }

    async compile(code) {
        const { errors, cst } = await this.cpc.awaitAnswer("compile", { code });
        return { errors, cst };
    }

    async getCommands(guildId, channelId) {
        const query = { guildId, enabled: true, type: TYPE.COMMAND };
        if (channelId) query.disabled_channels = {
            $not: {
                $all: [channelId]
            }
        };

        return await this.database.find(query).toArray();
    }

    async getCommandsForWeb(guildId) {
        const rows = await this.database.find({ guildId }).toArray();
        const errors = new Map;
        for (let row of rows) {
            const err = await this.errors_db.find({ commandId: row.id, ts: { $gt: row.last_read } }).count().catch(() => 0);
            errors.set(row.id, err);
        }

        return rows.sort((a, b) => {
            const bmod = b.modified_at || b.created_at;
            const amod = a.modified_at || a.created_at;
            if (bmod < amod) return -1;
            if (bmod > amod) return 1;
            return 0;
        }).map(row => new WebCommand(row, errors.get(row.id)));
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
            type, trigger, case_sensitive,
            use_trixiescript: true,
            replies: [],
            code, cst: cst ? BSON.serialize(cst) : null,
            compile_errors,
            last_read: new Date,
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