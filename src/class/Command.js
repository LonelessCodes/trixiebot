const log = require("../modules/log");
const timeoutDB = require("../modules/database/timeout");
const Discord = require("discord.js");

class Command {
    /**
     * @param {function(Discord.Message)} onmessage 
     * @param {function(Discord.Client)} init 
     */
    constructor(onmessage, init = (async () => { }), opts = {}) {
        /** @type {(message: Discord.Message) => void} */
        this.onmessage = onmessage.bind(this);
        /** @type {(client: Discord.Client) => Promise<void>} */
        this._init = (async () => { });
        /** @type {string} */
        this.usage = null;

        if (typeof init === "function") {
            this._init = init.bind(this);
            if (opts.usage && typeof opts.usage === "string") this.usage = opts.usage;
            this.ignore = !!opts.ignore;
        } else {
            if (init.usage && typeof init.usage === "string") this.usage = init.usage;
            this.ignore = !!init.ignore;
        }
    }

    /**
     * @param {Discord.Client} client 
     */
    async init(client) {
        await this._init(client);

        client.on("message", async message => {
            if (message.author.bot) return;
            if (message.channel.type !== "text") return;
            if (this.ignore &&
                await timeoutDB.findOne({ guildId: message.guild.id, memberId: message.member.id })) return;


            // clean up multiple whitespaces
            message.content = message.content.replace(/\s+/g, " ").trim();

            this.onmessage(message).catch(err => {
                log(err);
                message.channel.send(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...
\`${err.name}: ${err.message}\``);
            });
        });
        return this;
    }
}

module.exports = Command;
