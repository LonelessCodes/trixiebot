const log = require("./log");

class Command {
    /**
     * @param {function(Discord.Message)} onmessage 
     * @param {function(Discord.Client)} init 
     */
    constructor(onmessage, init = (async () => { }), opts = {}) {
        this.onmessage = onmessage.bind(this);
        this._init = (async () => { });
        if (typeof init === "function") {
            this._init = init.bind(this);
            if (opts.usage && typeof opts.usage === "string") this.usage = opts.usage;
            if (opts.category && typeof opts.category === "string") this.category = opts.category;
        } else {
            if (init.usage && typeof init.usage === "string") this.usage = init.usage;
            if (init.category && typeof init.category === "string") this.category = init.category;
        }
    }

    /**
     * @param {Discord.Client} client 
     */
    async init(client) {
        await this._init(client);
        client.on("message", message => {
            if (message.author.bot) return;
            if (message.channel.type !== "text") return;

            this.onmessage(message).catch(err => {
                log(err);
                message.channel.send("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
            });
        });
    }
}

module.exports = Command;
