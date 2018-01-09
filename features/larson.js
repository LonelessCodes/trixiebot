const Command = require("../modules/Command");

const command = new Command(async function onmessage(message) {
    if (/^\!larson/i.test(message.content)) {
        message.channel.send("https://cdn.discordapp.com/attachments/397369538196406275/399707043281502208/C2OMrf3UcAARAGc.png");
    }
}, {
    usage: "`!larson` larson.",
    ignore: true
});

module.exports = command;
