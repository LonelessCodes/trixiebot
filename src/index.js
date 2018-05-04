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
            locale: "en",
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
        const features = new Command.CommandManager(this.client, this.config, this.db);

        for (const file of await walk(path.resolve(__dirname, "features"))) {
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

async function createUsage(fields, features, message) {
    const type = message.channel.type;
    const dm = type === "dm";

    const usage = new Discord.RichEmbed;

    for (const [title, command] of fields) {
        if (!title) usage.addBlankField();
        else {
            const feature = features.get(command);
            if (!feature) usage.addField(title, command);
            else if (!(dm && feature.guildOnly)) {
                usage.addField(title, feature.usage(message.prefix));
            }
        }
    }

    return usage;
}

class AppCommand extends Command {
    constructor(client, config, features) {
        super(client, config);
        this.features = features;
    }

    async onbeforemessage(message) {
        if (message.content.startsWith("!") && message.channel.type === "dm") {
            await message.channel.send("You can use the commands without a prefix when you're in a DM channel.");
            message.origContent = message.content;
            message.content = message.content.substr(1);
        }
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

            const usage = await createUsage([
                // ["Invite to your server", `\`${message.prefix}invite\``],
                ["Derpibooru", "derpi"],
                ["E621", "e621"],
                ["Giphy", "gif"],
                ["Roles", "role"],
                ["Polls", "poll"],
                ["MLP Wikia", "mlp"],
                ["Uberfacts", "fact"],
                ["TTS", "tts"],
                ["Flip a Coin", "coin"],
                ["Fuck a User", "trash/fuck"],
                ["Flip Things", "trash/flip"],
                ["Text Faces", "trash/face"],
                ["Mlem", "trash/mlem"],
                ["Hugs", "trash/hugs"],
                ["Smolerize", "trash/smol"],
                ["Larson", "trash/larson"],
                ["CATS", "trash/cat"],
                ["DOGS", "trash/dog"],
                [],
                ["Admin", "admin/timeout"],
                ["Blacklist Words", "admin/mute"],
                ["Deleted Messages", "admin/deleted-messages"],
                ["Trixie Config", "admin/config"]
            ], this.features, message);
            usage.setDescription(this.features.get("app").usage(message.prefix));
            usage.setColor(0x71B3E6);
            usage.setFooter(`TrixieBot v${packageFile.version}`, this.client.user.avatarURL);

            // if (await this.config.get(message.guild.id, "calling")) 
            //     usage.addField("Call into other servers", this.features.get("call").usage(message.prefix));

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
        } else if (/^!donate\b/i.test(message.content)) {
            await message.channel.send("https://ko-fi.com/loneless");
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
