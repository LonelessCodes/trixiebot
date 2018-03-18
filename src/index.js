const discordKeys = require("../keys/discord.json");
const packageFile = require("../package.json");
const { walk } = require("./modules/util");
const log = require("./modules/log");
const path = require("path");
const statistics = require("./logic/statistics");
const Discord = require("discord.js");
const { MongoClient } = require("mongodb");
const Command = require("./class/Command");
const ConfigManager = require("./logic/Config");

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
            process.exit(1);
        });
    }

    async initialize() {
        this.db = await MongoClient
            .connect("mongodb://localhost:27017/", { autoReconnect: true })
            .then(client => client.db("trixiebot"));

        statistics.get(statistics.STATS.SHARDS).set(1); // Sharding not implemented, so only one process of Trixie running

        this.config = new ConfigManager(this.client, this.db, {
            prefix: "!",
            calling: false
        });

        this.attachListeners();

        await new Promise(resolve => {
            this.client.once("ready", () => resolve());

            this.client.login(discordKeys.token);
        });

        await this.initializeFeatures();
    }

    async initializeFeatures() {
        /** @type {Map<string, Command>} */
        const features = new Map;
        for (let file of await walk(path.resolve(__dirname, "features"))) {
            if (path.extname(file) !== ".js") continue;

            /** @type {typeof Command} */
            const Feature = require(path.resolve("./features", file));
            features.set(
                file.substring((__dirname + "/features/").length, file.length - path.extname(file).length).replace(/\\/g, "/"),
                new Feature(this.client, this.config, this.db));
        }
        features.set("app", new AppCommand(this.client, this.config, features));

        this.client.addListener("message", async message => {
            if (message.author.bot) return;
            if (message.channel.type !== "text") return;
            const timeouted = await this.db.collection("timeout").findOne({ guildId: message.guild.id, memberId: message.member.id });

            // clean up multiple whitespaces
            message.content = message.content.replace(/\s+/g, " ").trim();

            features.forEach(async feature => {
                if (feature.ignore && timeouted) return;

                try {
                    await feature.onmessage(message);
                } catch (err) {
                    log(err);
                    message.channel.send(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...\n\`${err.name}: ${err.message}\``);
                }
            });
        });
    }

    attachListeners() {
        this.client.addListener("warn", warn => log.warn(warn));

        this.client.addListener("error", error => log.error(
            error.stack ||
                error.error ?
                error.error.stack || error.error :
                error
        ));

        this.client.addListener("debug", debug => {
            if (/heartbeat/i.test(debug)) return;
            log.debug("discord.js", debug);
        });

        this.client.addListener("disconnect", closeEvent => log.debug("discord.js", closeEvent));

        this.client.addListener("reconnecting", () => log.debug("discord.js", "Reconnecting"));

        this.client.addListener("resume", replayed => log.debug("discord.js", `Resumed ${replayed} time`));
    }
};

class AppCommand extends Command {
    constructor(client, config, features) {
        super(client, config);
        this.features = features;
    }
    async onmessage(message) {
        // ping pong
        if (/^!ping\b/i.test(message.content) ||
            /^!trixie ping\b/i.test(message.content)) {
            const m = await message.channel.send("pong! Wee hehe");
            const ping = m.createdTimestamp - message.createdTimestamp;
            await m.edit("pong! Wee hehe\n" +
                `:stopwatch: \`Latency is ${ping}ms\`\n` +
                `:heartbeat: \`API Latency is ${Math.round(this.client.ping)}ms\``);
            log(`Requested ping. Got ping of ${ping}ms`);
            return;
        }
        else if (/^!trixie\b/.test(message.content)) {
            const usage = new Discord.RichEmbed()
                .setColor(0x71B3E6)
                .setDescription("`!trixie` to get this help message.")
                .addField("Invite to your server", "`!invite`")
                .addField("Derpibooru", this.features.get("derpi").usage)
                .addField("E621", this.features.get("e621").usage)
                .addField("Giphy", this.features.get("gif").usage)
                .addField("Roles", this.features.get("role").usage)
                .addField("Polls", this.features.get("poll").usage)
                .addField("Call into other servers", this.features.get("call").usage)
                .addField("Uberfacts", this.features.get("trash/fact").usage)
                .addField("TTS", this.features.get("tts").usage)
                .addField("Flip a Coin", this.features.get("coin").usage)
                .addField("Fuck a User", this.features.get("trash/fuck").usage)
                .addField("Flip Things", this.features.get("trash/flip").usage)
                .addField("Text Faces", this.features.get("trash/face").usage)
                .addField("Mlem", this.features.get("trash/mlem").usage)
                .addField("Hugs", this.features.get("trash/hugs").usage)
                .addField("Larson", this.features.get("trash/larson").usage)
                .addField("CATS", this.features.get("trash/cat").usage)
                .addField("Version", "`!version`")
                .addBlankField()
                .addField("Admin", this.features.get("admin/timeout").usage)
                .setFooter(`TrixieBot v${packageFile.version}`, this.client.user.avatarURL);
            await message.channel.send({ embed: usage });
            log("Requested usage");
            return;
        } else if (/^!version\b/i.test(message.content)) {
            await message.channel.send(`v${packageFile.version}`);
            log("Requested version");
            return;
        } else if (/^!invite\b/i.test(message.content)) {
            const FLAGS = Discord.Permissions.FLAGS;
            const link = await this.client.generateInvite([
                FLAGS.MANAGE_ROLES,
                FLAGS.MANAGE_CHANNELS,
                FLAGS.MANAGE_NICKNAMES,
                FLAGS.VIEW_CHANNEL,
                FLAGS.MANAGE_MESSAGES,
                FLAGS.EMBED_LINKS,
                FLAGS.READ_MESSAGE_HISTORY,
                FLAGS.MENTION_EVERYONE,
                FLAGS.ADD_REACTIONS
            ]);
            await message.channel.send(link);
            return;
        }
    }
}

process.addListener("uncaughtException", error => {
    log.error(error.stack || error);
    process.exit();
});

process.addListener("unhandledRejection", (reason, p) => {
    log.warn("Unhandled Rejection at:", p);
});

process.addListener("warning", warning => {
    log.warn(warning.message); // Print the warning message
    log.warn(warning.stack);   // Print the stack trace
});
