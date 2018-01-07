const log = require("./log");

class Command {
    /**
     * @param {function(Discord.Message)} onmessage 
     * @param {function(Discord.Client)} init 
     * @this {Command}
     */
    constructor(onmessage, init) {
        this._onmessage = onmessage.bind(this);
        this._init = (init || (async () => { })).bind(this);
    }

    /**
     * @param {Discord.Client} client 
     */
    async init(client) {
        await this._init(client);
        client.on("message", message => {
            if (message.author.bot) return;
            if (message.channel.type !== "text") return;

            this._onmessage(message).catch(err => {
                log(err);
                message.channel.send("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
            });
        });
    }
}

module.exports = Command;
