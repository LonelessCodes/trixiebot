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
    /** @type {string} */
    get usage() { return null; }

    async init() { return this; }

    async onmessage() { }
}

module.exports = Command;
