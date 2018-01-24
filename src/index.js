const discordKeys = require("../keys/discord.json");
const packageFile = require("../package.json");
const walk = require("./modules/walk");
const log = require("./modules/log");
const path = require("path");
const Discord = require("discord.js");
const { MongoClient } = require("mongodb");
const Command = require("./class/Command");

/**
 * @param {Discord.Message} message 
 */
async function onmessage(client, features, message) {
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
            .addField("Invite to your server", "`!invite`")
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
    } else if (/^!invite\b/i.test(message.content)) {
        const FLAGS = Discord.Permissions.FLAGS;
        const link = await client.generateInvite([
            FLAGS.MANAGE_ROLES,
            FLAGS.MANAGE_CHANNELS,
            FLAGS.CHANGE_NICKNAME,
            FLAGS.MANAGE_NICKNAMES,
            FLAGS.VIEW_CHANNEL,
            FLAGS.READ_MESSAGES,
            FLAGS.SEND_MESSAGES,
            FLAGS.MANAGE_MESSAGES,
            FLAGS.EMBED_LINKS,
            FLAGS.ATTACH_FILES,
            FLAGS.READ_MESSAGE_HISTORY,
            FLAGS.MENTION_EVERYONE,
            FLAGS.ADD_REACTIONS,
            FLAGS.CONNECT,
            FLAGS.SPEAK
        ]);
        await message.channel.send(link);
        return;
    }
}

new class App {
    constructor() {
        // we're never removing and later adding listeners, so Infinity in .setMaxListeners() is ok
        this.client = new Discord.Client({ autoReconnect: true }).setMaxListeners(Infinity);
        this.initialize().then(() => {
            log("I am ready");

            this.client.user.setStatus("online");
            this.client.user.setActivity("!trixie for help", { type: "PLAYING" });
        }).catch(err => {
            log("Failed to log in");
            log.error(err);
        });
    }

    async initialize() {
        const db = await MongoClient
            .connect("mongodb://localhost:27017/", { autoReconnect: true })
            .then(client => client.db("trixiebot"));

        this.attachListeners();

        await new Promise(resolve => {
            this.client.once("ready", () => resolve());

            this.client.login(discordKeys.token);
        });

        /** @type {Map<string, Command>} */
        const features = new Map;
        for (let file of await walk(path.resolve(__dirname, "features"))) {
            if (path.extname(file) !== ".js") continue;

            /** @type {Command} */
            const feature = require(path.resolve("./features", file));
            await feature.init(this.client, db);
            features.set(file.substring(__dirname.length, file.length - path.extname(file).length), feature);
        }
        features.set("app", new Command(onmessage.bind(null, this.client, features), { ignore: true }).init(this.client, db));

        this.client.on("message", async message => {
            if (message.author.bot) return;
            if (message.channel.type !== "text") return;
            const timeouted = await db.collection("timeout").findOne({ guildId: message.guild.id, memberId: message.member.id });

            // clean up multiple whitespaces
            message.content = message.content.replace(/\s+/g, " ").trim();

            features.forEach(feature => {
                if (typeof feature.onmessage !== "function") return;
                if (feature.ignore && timeouted) return;

                feature.onmessage(message).catch(err => {
                    log(err);
                    message.channel.send(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...\n\`${err.name}: ${err.message}\``);
                });
            });
        });
    }

    attachListeners() {
        this.client.on("warn", warn => log.warn(warn));

        this.client.on("error", error => log.error(
            error.stack ||
                error.error ?
                error.error.stack || error.error :
                error
        ));

        this.client.on("debug", debug => {
            if (/heartbeat/i.test(debug)) return;
            log.debug("discord.js", debug);
        });

        this.client.on("disconnect", closeEvent => log.debug("discord.js", closeEvent));

        this.client.on("reconnecting", () => log.debug("discord.js", "Reconnecting"));

        this.client.on("resume", replayed => log.debug("discord.js", `Resumed ${replayed} time`));
    }
};

process.on("uncaughtException", error => log.error(error.stack || error));

process.on("unhandledRejection", (reason, p) => {
    log.warn("Unhandled Rejection at:", p);
});

process.on("warning", warning => {
    log.warn(warning.message); // Print the warning message
    log.warn(warning.stack);   // Print the stack trace
});
