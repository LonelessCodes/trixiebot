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
            calling: false,
            lang: "en",
            explicit: false,
            admin_role: null,
            uom: "in"
        });

        this.attachListeners();

        await new Promise(resolve => {
            this.client.once("ready", () => resolve());

            this.client.login(discordKeys.token);
        });

        await this.initializeFeatures();
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

    async initializeFeatures() {
        const features = new Command.CommandManager(this.client, this.db);

        for (let file of await walk(path.resolve(__dirname, "features"))) {
            if (path.extname(file) !== ".js") continue;

            /** @type {typeof Command} */
            const Feature = require(path.resolve("./features", file));
            features.registerCommand(
                file.substring((__dirname + "/features/").length, file.length - path.extname(file).length).replace(/\\/g, "/"),
                new Feature(this.client, this.config, this.db));
        }
        features.registerCommand("app", new AppCommand(this.client, this.config, features));
    }
};

class AppCommand extends Command {
    constructor(client, config, features) {
        super(client, config);
        this.features = features;
    }
    async onmessage(message) {
        if (!message.prefixUsed) return;

        // ping pong
        if (/^ping\b/i.test(message.content) ||
            /^trixie ping\b/i.test(message.content)) {
            const m = await message.channel.send("pong! Wee hehe");
            const ping = m.createdTimestamp - message.createdTimestamp;
            await m.edit("pong! Wee hehe\n" +
                `:stopwatch: \`Latency is ${ping}ms\`\n` +
                `:heartbeat: \`API Latency is ${Math.round(this.client.ping)}ms\``);
            log(`Requested ping. Got ping of ${ping}ms`);
            return;
        }
        
        if (/^trixie\b/.test(message.content)
            || /^!trixie\b/.test(message.origContent)) { // still listen for ! prefix too
            const usage = new Discord.RichEmbed()
                .setColor(0x71B3E6)
                .setDescription(this.features.get("app").usage(message.prefix))
                // .addField("Invite to your server", `\`${message.prefix}invite\``)
                .addField("Derpibooru", this.features.get("derpi").usage(message.prefix))
                .addField("E621", this.features.get("e621").usage(message.prefix))
                .addField("Giphy", this.features.get("gif").usage(message.prefix))
                .addField("Roles", this.features.get("role").usage(message.prefix))
                .addField("Polls", this.features.get("poll").usage(message.prefix));
            // if (await this.config.get(message.guild.id, "calling")) 
            //     usage.addField("Call into other servers", this.features.get("call").usage(message.prefix));
            usage
                .addField("MLP Wikia", this.features.get("mlp").usage(message.prefix))
                .addField("Uberfacts", this.features.get("fact").usage(message.prefix))
                .addField("TTS", this.features.get("tts").usage(message.prefix))
                .addField("Flip a Coin", this.features.get("coin").usage(message.prefix))
                .addField("Fuck a User", this.features.get("trash/fuck").usage(message.prefix))
                .addField("Flip Things", this.features.get("trash/flip").usage(message.prefix))
                .addField("Text Faces", this.features.get("trash/face").usage(message.prefix))
                .addField("Mlem", this.features.get("trash/mlem").usage(message.prefix))
                .addField("Hugs", this.features.get("trash/hugs").usage(message.prefix))
                .addField("Smolerize", this.features.get("trash/smol").usage(message.prefix))
                .addField("Larson", this.features.get("trash/larson").usage(message.prefix))
                .addField("CATS", this.features.get("trash/cat").usage(message.prefix))
                .addField("Version", `\`${message.prefix}version\``)
                .addBlankField()
                .addField("Admin", this.features.get("admin/timeout").usage(message.prefix))
                .addField("Blacklist words", this.features.get("admin/mute").usage(message.prefix))
                .addField("Deleted Messages", this.features.get("admin/deleted-messages").usage(message.prefix))
                .addField("Trixie Config", this.features.get("admin/config").usage(message.prefix))
                .setFooter(`TrixieBot v${packageFile.version}`, this.client.user.avatarURL);
            await message.channel.send({ embed: usage });
            log("Requested usage");
            return;
        }
        
        if (/^version\b/i.test(message.content)) {
            await message.channel.send(`v${packageFile.version}`);
            log("Requested version");
            return;
        }
        
        if (/^invite\b/i.test(message.content)) {
            // const FLAGS = Discord.Permissions.FLAGS;
            // const link = await this.client.generateInvite([
            //     FLAGS.MANAGE_ROLES,
            //     FLAGS.MANAGE_CHANNELS,
            //     FLAGS.MANAGE_NICKNAMES,
            //     FLAGS.VIEW_CHANNEL,
            //     FLAGS.MANAGE_MESSAGES,
            //     FLAGS.EMBED_LINKS,
            //     FLAGS.READ_MESSAGE_HISTORY,
            //     FLAGS.MENTION_EVERYONE,
            //     FLAGS.ADD_REACTIONS
            // ]);
            // await message.channel.send(link);
            // return;
            await message.channel.send("Wait for v2.x. Current version: " + packageFile.version);
            return;
        }
    }

    usage(prefix) {
        return `\`${prefix}trixie\` to get this help message.`;
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
