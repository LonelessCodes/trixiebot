const Discord = require("discord.js");

class Command {
    /**
     * @param {function(Discord.Message)} onmessage 
     * @param {function(Discord.Client)} init 
     * @param {{ ignore: boolean; usage: string; }} opts 
     */
    constructor(onmessage, init, opts) {
        /** @type {(message: Discord.Message) => void} */
        this.onmessage = (onmessage || (async () => { })).bind(this);
        /** @type {(client: Discord.Client) => Promise<void>} */
        this._init = (async () => { });
        /** @type {string} */
        this.usage = null;
        this.ignore = false;

        if (typeof init === "function") {
            this._init = init.bind(this);
            if (opts) {
                if (opts.usage && typeof opts.usage === "string") this.usage = opts.usage;
                this.ignore = !!opts.ignore;
            }
        } else if(init) {
            if (init.usage && typeof init.usage === "string") this.usage = init.usage;
            this.ignore = !!init.ignore;
        }
    }

    /**
     * @param {Discord.Client} client 
     */
    async init(client, db) {
        await this._init(client, db);
        return this;
    }
}

module.exports = Command;
