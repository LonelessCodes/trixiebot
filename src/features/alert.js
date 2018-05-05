const fetch = require("node-fetch");
const log = require("../modules/log");
const Command = require("../class/Command");

const base = "https://api.picarto.tv/v1/";

async function request(api) {
    const r = await fetch(base + api);
    return await r.json();
}

class AlertCommand extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("alert");
    }

    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^alert\b/i.test(message.content)) return;

        const msg = message.content.substr(6).trim();

        return;
    }

    usage(prefix) {
        return `\`${prefix}alert <page url> <channel>\` - subscribe Trixie to a Picarto channel
\`page url\` - copy the url of the stream page and paste it in here
\`channel\` - the channel to post the alert to later`;
    }
}

module.exports = AlertCommand;
