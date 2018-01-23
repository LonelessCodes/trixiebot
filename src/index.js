const discordKeys = require("../keys/discord.json");
const packageFile = require("../package.json");
const log = require("./modules/log");
const path = require("path");
const fs = require("fs-extra");
const Discord = require("discord.js");
const { MongoClient } = require("mongodb");
const Command = require("./class/Command");

// we're never removing and later adding listeners, so Infinity in .setMaxListeners() is ok
const client = new Discord.Client({ autoReconnect: true }).setMaxListeners(Infinity);

const dbPromise = MongoClient
    .connect("mongodb://localhost:27017/", { autoReconnect: true })
    .then(client => client.db("trixiebot"));

dbPromise.then(db => {

});

/** @type {Map<string, Command>} */
const features = new Map;
(async function () {
    const filenames = await fs.readdir(__dirname + "/features");
    for (let file of filenames) {
        if (path.extname(file) !== ".js") continue;

        /** @type {Command} */
        const feature = require("./features/" + file);
        await feature.init(client);
        log.debug(file, "loaded");
        features[file.substr(0, file.length - path.extname(file).length)] = feature;
    }
})();

async function onmessage(message) {
    // ping pong
    if (/^!ping\b/i.test(message.content) ||
        /^!trixie ping\b/i.test(message.content)) {
        const m = await message.channel.send("pong! Wee hehe");
        const ping = m.createdTimestamp - message.createdTimestamp;
        await m.edit("pong! Wee hehe\n" +
            `:stopwatch: \`Latency is ${ping}ms\`\n` +
            `:heartbeat: \`API Latency is ${Math.round(client.ping)}ms\``);
        log(`Requested ping. Got ping of ${ping}ms`);
        return;
    }
    else if (/^!trixie\b/.test(message.content)) {
        const usage = new Discord.RichEmbed()
            .setColor(0x71B3E6)
            .setDescription("`!trixie` to get this help message.")
            .addField("Derpibooru", features.get("derpi").usage)
            .addField("E621", features.get("e621").usage)
            .addField("Giphy", features.get("gif").usage)
            .addField("Roles", features.get("role").usage)
            .addField("Polls", features.get("poll").usage)
            .addField("Uberfacts", features.get("fact").usage)
            .addField("TTS", features.get("tts").usage)
            .addField("Flip a Coin", features.get("coin").usage)
            .addField("Fuck a User", features.get("fuck").usage)
            .addField("Flip Things", features.get("flip").usage)
            .addField("Text Faces", features.get("face").usage)
            .addField("Mlem", features.get("mlem").usage)
            .addField("Larson", features.get("larson").usage)
            .addField("CATS", features.get("cat").usage)
            .addField("Version", "`!version`")
            .addBlankField()
            .addField("Admin", features.get("timeout").usage)
            .setFooter(`TrixieBot v${packageFile.version}`, client.user.avatarURL);
        await message.channel.send({ embed: usage });
        log("Requested usage");
        return;
    } else if (/^!version\b/i.test(message.content)) {
        await message.channel.send(`v${packageFile.version}`);
        log("Requested version");
        return;
    }
}

new Command(onmessage, { ignore: true }).init(client);

client.on("ready", () => {
    log("I am ready");

    client.user.setStatus("online");
    client.user.setActivity("!trixie for help", { type: "PLAYING" });
});

client.on("warn", warn => log.warn(warn));

client.on("error", error => log.error(
    error.stack ||
        error.error ?
        error.error.stack || error.error :
        error
));

client.on("debug", debug => {
    if (/heartbeat/i.test(debug)) return;
    log.debug("discord.js", debug);
});

client.on("disconnect", closeEvent => log.debug("discord.js", closeEvent));

client.on("reconnecting", () => log.debug("discord.js", "Reconnecting"));

client.on("resume", replayed => log.debug("discord.js", `Resumed ${replayed} time`));

process.on("uncaughtException", error => log.error(error.stack || error));

process.on("unhandledRejection", (reason, p) => {
    log.warn("Unhandled Rejection at:", p);
});

process.on("warning", warning => {
    log.warn(warning.message); // Print the warning message
    log.warn(warning.stack);   // Print the stack trace
});

client.login(discordKeys.token);
