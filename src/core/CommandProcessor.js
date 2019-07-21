const log = require("../log").namespace("processor");
const INFO = require("../info");
const { splitArgs } = require("../util/string");
const stats = require("../modules/stats");
const guild_stats = require("./managers/GuildStatsManager");
const CommandRegistry = require("./CommandRegistry");
const CommandDispatcher = require("./CommandDispatcher");
const nanoTimer = require("../modules/nanoTimer");
// eslint-disable-next-line no-unused-vars
const { Message, Permissions } = require("discord.js");

/**
 * @param {Message} message 
 */
async function onProcessingError(message, err) {
    log.error(
        "ProcessingError {\n" +
        "  content:     " + JSON.stringify(message.content) + "\n" +
        "  channelType: " + message.channel.type + "\n" + 
        (message.channel.type === "text" ? "  guildId:   " + message.guild.id + "\n" : "") +
        "  channelId:   " + message.channel.id + "\n" +
        "  userId:      " + message.author.id + "\n" +
        "  error:      ", err, "}"
    );

    try {
        if (INFO.DEV) await message.channel.sendTranslated(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...\n\`${err.name}: ${err.message}\``);
        else await message.channel.sendTranslated("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
    } catch (_) { _; } // doesn't have permissions to send. Uninteresting to us
}

class CommandProcessor {
    constructor(client, config, database) {
        this.client = client;
        this.config = config;
        this.db = database;

        this.REGISTRY = new CommandRegistry(client, database);
        this.DISPATCHER = new CommandDispatcher(client, database, this.REGISTRY);

        stats.bot.register("COMMANDS_EXECUTED", true);
        stats.bot.register("MESSAGES_TODAY", true);

        guild_stats.registerCounter("commands");
        guild_stats.registerCounter("messages");
    }

    /**
     * @param {Message} message 
     */
    async onMessage(message) {
        const timer = nanoTimer();

        try {
            if (message.author.bot || message.author.equals(message.client.user)) return;

            stats.bot.get("MESSAGES_TODAY").inc(1);
            if (message.channel.type === "text")
                guild_stats.get("messages").add(new Date, message.guild.id, message.channel.id, message.author.id);

            if (message.channel.type === "text" &&
                !message.channel.permissionsFor(message.guild.me).has(Permissions.FLAGS.SEND_MESSAGES, true))
                return;

            await this.run(message, timer);
        } catch (err) {
            await onProcessingError(message, err);
        }
    }

    async run(message, timer) {
        let raw_content = message.content;

        // remove prefix
        let me = "";
        let prefix = "";
        let prefix_used = true;

        if (message.channel.type === "text") {
            // eslint-disable-next-line require-atomic-updates
            message.guild.config = await this.config.get(message.guild.id);

            me = message.guild.me.toString();
            prefix = message.guild.config.prefix;
        }

        // check prefixes
        if (raw_content.startsWith(`${me} `)) {
            raw_content = raw_content.substr(me.length + 1);
        } else if (raw_content.startsWith(prefix)) {
            raw_content = raw_content.substr(prefix.length);
        } else {
            prefix_used = false;
        }

        const msg = Object.assign(Object.create(message), message, { prefix, prefix_used });

        const [command_name, processed_content] = splitArgs(raw_content, 2);

        const executed = await this.DISPATCHER.process(msg, command_name.toLowerCase(), processed_content, prefix, prefix_used, timer);

        // const diff = timer.end();
        // commandTime.observe(diff);

        // use some stats observing software

        if (!executed) return;

        stats.bot.get("COMMANDS_EXECUTED").inc(1);
        
        if (message.channel.type === "text")
            await guild_stats.get("commands").add(new Date, message.guild.id, message.channel.id, message.author.id, command_name);
    }
}

module.exports = CommandProcessor;