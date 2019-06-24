const log = require("../../modules/log");
const INFO = require("../../info");
const { splitArgs } = require("../../modules/util/string");
const stats = require("../stats");
const guild_stats = require("../managers/GuildStatsManager");
const CommandRegistry = require("../core/CommandRegistry");
const nanoTimer = require("../../modules/NanoTimer");
// eslint-disable-next-line no-unused-vars
const { Message, Permissions } = require("discord.js");

/**
 * @param {Message} message 
 */
async function onProcessingError(message, err) {
    log.error(err);

    try {
        if (INFO.DEV) await message.channel.sendTranslated(`Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...\n\`${err.name}: ${err.message}\``);
        else await message.channel.sendTranslated("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
    } catch (_) { _; }
}

class CommandProcessor {
    constructor(client, config, database) {
        this.client = client;
        this.config = config;
        this.db = database;

        this.REGISTRY = new CommandRegistry(client, config, database);

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
                !message.channel.memberPermissions(message.guild.me).has(Permissions.FLAGS.SEND_MESSAGES, true))
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
        let prefixUsed = true;

        if (message.channel.type === "text") {
            message.guild.config = await this.config.get(message.guild.id);

            me = message.guild.me.toString();
            prefix = message.guild.config.prefix;
        } else {
            return;
        }

        // check prefixes
        if (raw_content.startsWith(`${me} `)) {
            raw_content = raw_content.substr(me.length + 1);
        } else if (raw_content.startsWith(prefix)) {
            raw_content = raw_content.substr(prefix.length);
        } else {
            prefixUsed = false;
        }

        const msg = Object.assign(Object.create(message), message, { prefix, prefixUsed });

        const [command_name, processed_content] = splitArgs(raw_content, 2);

        const executed = await this.REGISTRY.process(msg, command_name.toLowerCase(), processed_content, prefix, prefixUsed, timer);

        // const diff = timer.end();
        // commandTime.observe(diff);

        // use some stats observing software

        if (executed) {
            stats.bot.get("COMMANDS_EXECUTED").inc(1);
            
            if (message.channel.type === "text")
                await guild_stats.get("commands").add(new Date, message.guild.id, message.channel.id, message.author.id, command_name);
        }
    }
}

module.exports = CommandProcessor;