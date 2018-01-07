const log = require("./log");

class Command {
    /**
     * @param {function(Discord.Message)} onmessage 
     * @param {function(Discord.Client)} init 
     */
    constructor(onmessage, init) {
        this._onmessage = onmessage;
        this._init = init || (async () => { });
    }

    /**
     * @param {Discord.Client} client 
     */
    async init(client) {
        await this._init(client);
        client.on("message", message => {
            this._onmessage(message).catch(err => {
                log(err);
                message.channel.send("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
            });
        });
    }
}

module.exports = Command;
