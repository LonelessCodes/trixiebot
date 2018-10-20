const log = require("../modules/log");
const { removePrefix } = require("../modules/util");
const { Message, Client, Channel, Guild } = require("discord.js");
const ConfigManager = require("../logic/Config");
const LocaleManager = require("../logic/Locale");

// give each Channel and Guild class a locale function, which returns the locale config for this
// specific namespace, and on a Message class give the whole locale config
Message.prototype.locale = function () { return this.client.locale.get(this.guild ? this.guild.id : ""); };
Channel.prototype.locale = function () { return this.client.locale.get(this.guild ? this.guild.id : "", this.id || ""); };
Guild.prototype.locale = async function () { return (await this.client.locale.get(this.id)).global; };

Message.prototype.translate = LocaleManager.autoTranslate;
Channel.prototype.translate = LocaleManager.autoTranslateChannel;
Channel.prototype.sendTranslated = LocaleManager.sendTranslated;

class Command {
    /**
     * @param {Client} client 
     * @param {ConfigManager} config 
     */
    constructor(client, config) {
        this.client = client;
        this.config = config;
    }

    get ignore() { return true; }
    get guildOnly() { return false; }
    get category() { return "Other"; }
    /** 
     * @param {string} prefix
     * @returns {string} 
     */
    usage() { return null; }

    async init() { return this; }

    async onbeforemessage() { }

    async onmessage() { }
}

Command.CommandManager = class CommandManager {
    constructor(client, config, db) {
        /** @type {Map<string, Command>} */
        this.commands = new Map;

        client.addListener("message", async message => {
            if (message.author.bot) return;

            const type = message.channel.type;
            if (type !== "text" &&
                type !== "dm") return;

            message.guild.config = {};
            let timeouted = false;
            if (type === "text") {
                timeouted = await db.collection("timeout").findOne({ guildId: message.guild.id, memberId: message.member.id });
                message.guild.config = await config.get(message.guild.id);
            }

            this.commands.forEach(async command => {
                if (command.ignore && timeouted) return;
                if (type === "dm" && command.guildOnly) return;

                try {
                    const passthru = await command.onbeforemessage(message); // this function may return information
                    // remove prefix for prefix independant commands
                    const cleanMessage = await removePrefix(message);
                    // clean up multiple whitespaces
                    cleanMessage.content = cleanMessage.content.replace(/\s+/g, " ").trim();
                    await command.onmessage(cleanMessage, passthru);
                } catch (err) {
                    log(err);
                    message.channel.sendTranslated(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...\n\`${err.name}: ${err.message}\``);
                }
            });
        });
    }

    /**
     * @param {string} id
     * @param {Command} command
     */
    registerCommand(id, command) {
        this.commands.set(id, command);
    }

    /**
     * @param {string} id
     */
    get(id) {
        return this.commands.get(id);
    }
};

Command.GUILD_ONLY = 0;
Command.GUILD_AND_GROUP = 1;
Command.ALL = 2;

module.exports = Command;
