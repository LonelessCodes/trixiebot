const { splitArgs } = require("../../modules/string_utils");
const CommandRegistry = require("../core/CommandRegistry");

class CommandProcessor {
    constructor(client, config, database) {
        this.client = client;
        this.config = config;
        this.db = database;

        this.REGISTRY = new CommandRegistry(client, config, database);
    }

    async run(message) {
        let raw_content = message.content;

        // remove prefix
        let me = "";
        let prefix = "";
        let prefixUsed = true;

        if (message.channel.type === "text") {
            message.guild.config = await this.config.get(message.guild.id);

            me = message.guild.me.toString();
            prefix = message.guild.config.prefix;
        // } else if (message.channel.type === "dm" ||
        //     message.channel.type === "group") {
        //     me = message.client.user.toString();
        //     prefix = message.client.config.default_config;
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

        const executed = await this.REGISTRY.process(msg, command_name.toLowerCase(), processed_content, prefix, prefixUsed);

        // const diff = timer.end();
        // commandTime.observe(diff);

        // use some stats observing software

        return executed;
    }
}

module.exports = CommandProcessor;