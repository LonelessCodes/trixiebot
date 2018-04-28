const log = require("../modules/log");
const { removePrefix } = require("../modules/util");
const { Message, Client } = require("discord.js");
const ConfigManager = require("../logic/Config");

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
    constructor(client, db) {
        /** @type {Map<string, Command>} */
        this.commands = new Map;

        client.addListener("message", async message => {
            if (message.author.bot) return;
            if (message.channel.type !== "text" && message.channel.type !== "dm") return;

            const timeouted = await db.collection("timeout").findOne({ guildId: message.guild.id, memberId: message.member.id });

            this.commands.forEach(async command => {
                if (command.ignore && timeouted) return;

                try {
                    const passthru = await command.onbeforemessage(message); // this function may return information
                    // remove prefix for prefix independant commands
                    const cleanMessage = await removePrefix(message, command.config);
                    // clean up multiple whitespaces
                    cleanMessage.content = cleanMessage.content.replace(/\s+/g, " ").trim();
                    await command.onmessage(cleanMessage, passthru);
                } catch (err) {
                    log(err);
                    message.channel.send(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...\n\`${err.name}: ${err.message}\``);
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

module.exports = Command;
