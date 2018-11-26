const ipc = require("../ipc");
const AliasCommand = require("../../class/AliasCommand");

class WebsiteManager {
    constructor(REGISTRY, client, config, database) {
        this.REGISTRY = REGISTRY;
        this.client = client;
        this.config = config;
        this.db = database;

        this.initializeIPC();
    }

    async initializeIPC() {
        await ipc.promiseStart;

        ipc.answer("checkGuilds", async guildIds => {
            return guildIds.filter(guildId => this.client.guilds.has(guildId));
        });

        ipc.answer("commands", async guildId => {
            const disabledCommands = await this.db.collection("disabled_comments").find({
                guildId
            }).toArray();

            const commands = new Array;
            const prefix = await this.config.get(guildId, "prefix");
            for (let [name, command] of this.REGISTRY.commands) {
                const help = command.help;
                if (!help) return;

                name = command instanceof AliasCommand ? command.parentName : name;

                const enabled = disabledCommands.every(row => row.name !== name);
                
                commands.push({
                    name,
                    description: help.description,
                    parameters: new Map(help.parameters.entries().map(([c, usage]) => [c, usage(prefix)])),
                    usage: help.usage(prefix),
                    related: help.related,

                    enabled
                });
            }
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
}

module.exports = WebsiteManager;