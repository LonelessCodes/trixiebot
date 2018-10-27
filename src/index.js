const discordKeys = require("../keys/discord.json");
const packageFile = require("../package.json");
const { walk } = require("./modules/util");
const log = require("./modules/log");
const path = require("path");
const CONST = require("./modules/const");
const statistics = require("./logic/statistics");
const Discord = require("discord.js");
const { MongoClient } = require("mongodb");
const Command = require("./class/Command");
const ConfigManager = require("./logic/Config");
const Parameter = ConfigManager.Parameter;
const LocaleManager = require("./logic/Locale");

const ipc = require("./logic/ipc");

const { Message, Collector, Client } = Discord;

Array.prototype.last = function () {
    return this[this.length - 1];
};

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
            .connect("mongodb://localhost:27017/", {
                autoReconnect: true,
                useNewUrlParser: true
            })
            .then(client => client.db("trixiebot"));
        this.client.db = this.db;

        statistics.get(statistics.STATS.SHARDS).set(1); // Sharding not implemented, so only one process of Trixie running

        this.config = new ConfigManager(this.client, this.db, [
            new Parameter("prefix", "❗ Prefix", "!", String),

            // new Parameter("calling", "📞 Accept calls servers", false, Boolean),
            // new Parameter("admin_role", "👮 Set role for admin commands", null, String, true),
            new Parameter("uom", "📐 Measurement preference", "cm", ["cm", "in"]),
            // new Parameter("time", "🕑 Time display preference", "24h", ["24h", "12h"]),

            // new Parameter([
            //     new Parameter("announce.channel", "Channel. 'none' annoucements disabled", null, String, true),
            //     new Parameter("announce.bots", "Ignore Bots", true, Boolean)
            // ], "🚪 Announce new/leaving users"),

            // new Parameter([
            //     new Parameter("welcome.enabled", "true/false", true, Boolean),
            //     new Parameter("welcome.text", "Custom Text ('$user' as user)", null, String, true)
            // ], "👋 Announce new users"),

            // new Parameter([
            //     new Parameter("leave.enabled", "true/false", true, Boolean),
            //     new Parameter("leave.text", "Custom Text ('$user' as user)", null, String, true)
            // ], "🚶 Announce leaving users")
        ]);
        this.client.config = this.config;

        this.locale = new LocaleManager(this.client, this.db, [
            "en", "de", "hu"
        ]);
        this.client.locale = this.locale;

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
        features.registerCommand("app", new AppCommand(this.client, this.config, this.db, features));
    }
};

class AppCommand extends Command {
    /**
     * 
     * @param {Client} client 
     * @param {ConfigManager} config 
     * @param {Map<string, Command>} features 
     */
    constructor(client, config, db, features) {
        super(client, config);
        this.features = features;

        this.db = db.collection("bot_stats");

        this.initializeIPC();
        this.initCommandStats();
    }

    async initializeIPC() {
        await ipc.promiseStart;

        ipc.answer("checkGuilds", async guildIds => {
            return guildIds.filter(guildId => this.client.guilds.has(guildId));
        });

        ipc.answer("commands", async guildId => {
            const commands = new Array;
            const prefix = await this.config.get(guildId, "prefix");
            this.features.commands.forEach(feature => {
                const usage = feature.usage(prefix);
                if (!usage) return;

                const match = usage.match(new RegExp(`^\\\`${prefix}\\w+\\b`, "gi"));
                if (!match || !match[0]) return;

                const name = match[0].substr(2);
                if (name === "") return;

                commands.push({
                    name,
                    description: usage,
                    enabled: true
                });
            });
            return commands;
        });

        ipc.answer("settings", async guildId => {
            const config = await this.config.get(guildId);
            const locale = await this.client.locale.get(guildId);

            return Object({}, config, { locale });
        });

        ipc.answer("resetSettings", async guildId => {
            await this.config.set(guildId, this.config.default_config);
            await this.client.locale.set(guildId, "en");

            const config = await this.config.get(guildId);
            const locale = await this.client.locale.get(guildId);

            return Object({}, config, { locale });
        });
    }

    async initCommandStats() {
        const commandStat = statistics.get(statistics.STATS.COMMANDS_EXECUTED);

        commandStat.set((await this.db.findOne({ name: statistics.STATS.COMMANDS_EXECUTED }) || { value: 0 }).value);

        commandStat.on("change", value => this.db.updateOne({ name: statistics.STATS.COMMANDS_EXECUTED }, { $set: { value } }, { upsert: true }));

        /** @type {Map<string, Collector>} */
        this.collectors = new Map;

        // command statistics
        this.client.addListener("message", async message => {
            if (!message.content.startsWith(await this.config.get(message.guild.id, "prefix"))) return;

            if (typeof message.channel.awaitMessages !== "function") return;
            if (this.collectors.has(message.channel.id)) {
                this.collectors.get(message.channel.id).stop();
            }

            const collector = message.channel.createCollector(message => message.member.id === message.guild.me.id, {
                max: 1,
                maxMatches: 1,
                time: 60 * 1000
            });
            this.collectors.set(message.channel.id, collector);

            collector.once("end", (collected, reason) => {
                if (reason === "time") {
                    if (this.collectors.has(message.channel.id))
                        this.collectors.delete(message.channel.id);
                } else {
                    if (this.collectors.has(message.channel.id))
                        this.collectors.delete(message.channel.id);
                    if (!collected.size) return;
                    commandStat.inc(1);
                }
            });
        });
    }

    async onbeforemessage(message) {
        if (message.content.startsWith("!") && message.channel.type === "dm") {
            await message.channel.send("You can use the commands without a prefix when you're in a DM channel.");
            message.origContent = message.content;
            message.content = message.content.substr(1);
        }
    }

    /**
     * @param {Message} message 
     */
    async onmessage(message) {
        if (!message.prefixUsed) return;

        // ping pong
        if (/^ping\b/i.test(message.content) ||
            /^trixie ping\b/i.test(message.content)) {
            const pongText = await message.channel.translate("pong! Wee hee");
            const m = await message.channel.send(pongText);
            const ping = m.createdTimestamp - message.createdTimestamp;
            await m.edit(pongText + "\n" +
                `:stopwatch: \`Latency is ${ping}ms\`\n` +
                `:heartbeat: \`API Latency is ${Math.round(this.client.ping)}ms\``);
            log(`Requested ping. Got ping of ${ping}ms`);
            return;
        }

        if (/^help\b/.test(message.content)) {
            /**
             * @type {string}
             */
            let msg = message.content.substr(5).trim();
            if (msg === "") return;

            /** @type {Command} */
            const command = new Map(Array.from(this.features.commands.entries()).map(entry => {
                return [entry[0].split("/").last().toLowerCase(), entry[1]];
            })).get(msg.toLowerCase());
            if (!command) return;

            const embed = new Discord.RichEmbed().setColor(CONST.COLOUR);
            embed.setTitle(`Help for \`${msg.toLowerCase()}\``);
            embed.setDescription(command.usage(message.prefix));

            await message.channel.send({ embed });
            log(`Send help for ${msg.toLowerCase()}`);
            return;
        }

        if (/^trixie\b/i.test(message.content)
            || /^!trixie\b/i.test(message.origContent)) { // still listen for ! prefix too

            const embed = new Discord.RichEmbed().setColor(CONST.COLOUR);

            embed.addField("Images Commands", ["derpi", "e621", "gif", "larson", "cat", "dog"].sort().map(s => `\`${s}\``).join(", "));
            embed.addField("Action Commands", ["fuck", "flip", "mlem", "hug", "waifu"].sort().map(s => `\`${s}\``).join(", "));
            embed.addField("Audio Commands", ["tts", "call"].sort().map(s => `\`${s}\``).join(", "));
            embed.addField("Mod Commands", ["config", "deleted", "locale", "mute", "timeout", "alert"].sort().map(s => `\`${s}\``).join(", "));
            embed.addField("Info Commands", ["trixie", "serverinfo", "stats", "version", "donate"].sort().map(s => `\`${s}\``).join(", "));
            embed.addField("Utility Commands", ["fact", "mlp", "stats"].sort().map(s => `\`${s}\``).join(", "));
            embed.addField("Misc Commands", ["coin", "face", "smol", "expand dong", "penis", "cider", "invite", "poll", "role", "tellme"].sort().map(s => `\`${s}\``).join(", "));

            embed.setAuthor("TrixieBot Help", this.client.user.avatarURL);
            embed.setDescription(`Command list\nTo check command usage, type !trixie help <command> // -> Commands: ${this.features.commands.size}`);
            embed.setFooter(`TrixieBot v${packageFile.version}`, this.client.user.avatarURL);

            await message.channel.send({ embed });
            log("Requested usage");
            return;
        }

        if (/^version\b/i.test(message.content)) {
            await message.channel.send(`v${packageFile.version}`);
            log("Requested version");
            return;
        }

        if (/^invite\b/i.test(message.content)) {
            const FLAGS = Discord.Permissions.FLAGS;
            const link = await this.client.generateInvite([
                FLAGS.MANAGE_ROLES,
                FLAGS.MANAGE_CHANNELS,
                FLAGS.VIEW_CHANNEL,
                FLAGS.MANAGE_MESSAGES,
                FLAGS.EMBED_LINKS,
                FLAGS.MENTION_EVERYONE,
                FLAGS.ADD_REACTIONS
            ]);
            await message.channel.send(link);
            return;
        }

        if (/^donate\b/i.test(message.content)) {
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
