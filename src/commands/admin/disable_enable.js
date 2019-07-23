const SimpleCommand = require("../../core/commands/SimpleCommand");
const HelpCommand = require("../../core/commands/HelpCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");

module.exports = function install(cr, client, config, database) {
    /**
     * DISABLE
     */
    const disableCmd = cr.registerCommand("disable", new TreeCommand)
        .setHelp(new HelpContent("Disable Trixie from listening to some commands or channels"))
        .setCategory(Category.MODERATION);

    disableCmd.registerDefaultCommand(new HelpCommand);

    disableCmd.registerSubCommand("channel", new SimpleCommand(async message => {
        const channels = message.mentions.channels;
        if (channels.size < 1) {
            await message.channel.send("Uhm, I guess... but you gotta give me a channel or more to disable");
            return;
        }

        await database.collection("disabled_channels").updateOne({
            guildId: message.guild.id,
        }, {
            $addToSet: { channels: [...channels.array().map(c => c.id)] },
        }, { upsert: true });

        await message.channel.send(`Channels ${channels.map(c => c.toString()).join(", ")} will no longer listen to commands`);
    })).setHelp(new HelpContent()
        .setDescription("Disable Trixie from listening to a channel")
        .setUsage("<#channel>")
        .addParameter("#channel", "A channel or multiple channels"));

    disableCmd.registerSubCommand("command", new SimpleCommand(async (message, content) => {
        const commandsRaw = content.toLowerCase().split(/\s+/g);
        if (commandsRaw.length < 1) {
            await message.channel.send("Uhm, I guess... but you gotta give me a command or more to enable");
            return;
        }

        const commands = [];
        const dontExist = [];
        for (const name of commandsRaw) {
            if (cr.commands.has(name)) commands.push(name);
            else dontExist.push(name);
        }

        await database.collection("disabled_commands").updateOne({
            guildId: message.guild.id,
        }, {
            $addToSet: { commands: [...commands] },
        }, { upsert: true });

        await message.channel.send(`Commands ${commands.join(", ")} will no longer listen`);
    })).setHelp(new HelpContent()
        .setDescription("Disable a command")
        .setUsage("<command name>")
        .addParameter("command name", "The name of a command or a space seperated list of commands"));

    /**
     * ENABLE
     */
    const enableCmd = cr.registerCommand("enable", new TreeCommand)
        .setHelp(new HelpContent("If you have disabled channels or commands for Trixie, you can enable them here again."))
        .setCategory(Category.MODERATION);

    enableCmd.registerSubCommand("channel", new SimpleCommand(async message => {
        const channels = message.mentions.channels;
        if (channels.size < 1) {
            await message.channel.send("Uhm, I guess... but you gotta give me a channel or more to enable");
            return;
        }

        await database.collection("disabled_channels").updateOne({
            guildId: message.guild.id,
        }, {
            $pull: { channels: [...channels.array().map(c => c.id)] },
        });

        await message.channel.send(`Channels ${channels.map(c => c.toString()).join(", ")} will listen to commands again`);
    })).setHelp(new HelpContent()
        .setDescription("Enable Trixie from listening to a channel again")
        .setUsage("<#channel>")
        .addParameter("#channel", "A channel or multiple channels"));

    enableCmd.registerSubCommand("command", new SimpleCommand(async (message, content) => {
        const commandsRaw = content.toLowerCase().split(/\s+/g);
        if (commandsRaw.length < 1) {
            await message.channel.send("Uhm, I guess... but you gotta give me a command or more to enable");
            return;
        }

        const commands = [];
        const dontExist = [];
        for (const name of commandsRaw) {
            if (cr.commands.has(name)) commands.push(name);
            else dontExist.push(name);
        }

        await database.collection("disabled_commands").updateOne({
            guildId: message.guild.id,
        }, {
            $pull: { commands: [...commands] },
        });

        await message.channel.send(
            (dontExist.length > 0 ? `Commands ${dontExist.join(", ")} don't exist, but ` : "Commands ") +
            `${commands.join(", ")} will no longer listen to commands`
        );
    })).setHelp(new HelpContent()
        .setDescription("Enable a command again")
        .setUsage("<command name>")
        .addParameter("command name", "The name of a command or a space seperated list of commands"));
};
