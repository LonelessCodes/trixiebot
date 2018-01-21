const discord = require("../keys/discord.json");
const log = require("./modules/log");
const Discord = require("discord.js");
const p = require("../package.json");
const path = require("path");
const fs = require("fs");
const Command = require("./modules/Command");

const client = new Discord.Client({ autoReconnect: true });

client.setMaxListeners(Infinity); // we're never removing and later adding listeners, so Infinity is ok

const prefix = "!trixie";

const features = {};
for (let file of fs.readdirSync(__dirname + "/features")) {
    if (path.extname(file) === ".js") {
        const feature = require("./features/" + file);
        feature.init(client);
        features[file.substr(0, file.length - path.extname(file).length)] = feature;
    }
}

const command = new Command(async message => {
    // ping pong
    if (message.content.toLowerCase() === "!ping" ||
        message.content.toLowerCase() === `${prefix} ping`) {
        const m = await message.channel.send("pong! Wee hehe");
        const ping = m.createdTimestamp - message.createdTimestamp;
        await m.edit("pong! Wee hehe\n" +
            `:stopwatch: \`Latency is ${ping}ms\`\n` +
            `:heartbeat: \`API Latency is ${Math.round(client.ping)}ms\``);
        log(`Requested ping. Got ping of ${ping}ms`);
        return;
    }
    else if (message.content.toLowerCase() === prefix) {
        const usage = new Discord.RichEmbed()
            .setColor(0x71B3E6)
            .setDescription("`!trixie` to get this help message.")
            .addField("Derpibooru", features["derpi"].usage)
            .addField("E621", features["e621"].usage)
            .addField("Giphy", features["gif"].usage)
            .addField("Roles", features["role"].usage)
            .addField("Polls", features["poll"].usage)
            .addField("Uberfacts", features["fact"].usage)
            .addField("TTS", features["tts"].usage)
            .addField("Flip a Coin", features["coin"].usage)
            .addField("Fuck a User", features["fuck"].usage)
            .addField("Flip Things", features["flip"].usage)
            .addField("Text Faces", features["face"].usage)
            .addField("Mlem", features["mlem"].usage)
            .addField("Larson", features["larson"].usage)
            .addField("CATS", features["cat"].usage)
            .addField("Version", "`!version`")
            .addBlankField()
            .addField("Admin", features["admin"].usage)
            .setFooter(`TrixieBot v${p.version}`, client.user.avatarURL);
        await message.channel.send({ embed: usage });
        log("Requested usage");
        return;
    } else if (/^!version\b/i.test(message.content)) {
        await message.channel.send(`v${p.version}`);
        log("Requested version");
        return;
    } else if (/^!invite\b/i.test(message.content)) {
        const link = await client.generateInvite(["SEND_MESSAGES", "MANAGE_GUILD", "MENTION_EVERYONE"]);
        await message.channel.send(link);
        return;
    }
}, {
    ignore: true    
});

command.init(client);

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
    log.warn("Unhandled Rejection at:", p, "reason:", reason);
});

process.on("warning", warning => {
    log.warn(warning.message); // Print the warning message
    log.warn(warning.stack);   // Print the stack trace
});

client.login(discord.token);
