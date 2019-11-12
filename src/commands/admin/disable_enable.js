/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const SimpleCommand = require("../../core/commands/SimpleCommand");
const HelpCommand = require("../../core/commands/HelpCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");

const Translation = require("../../modules/i18n/Translation");
const TranslationPlural = require("../../modules/i18n/TranslationPlural");
const ListFormat = require("../../modules/i18n/ListFormat");

module.exports = function install(cr, { database }) {
    /**
     * DISABLE
     */
    const disableCmd = cr.registerCommand("disable", new TreeCommand)
        .setHelp(new HelpContent("Disable Trixie from listening to some commands or channels"))
        .setCategory(Category.MODERATION);

    disableCmd.registerDefaultCommand(new HelpCommand);

    disableCmd.registerSubCommand("channel", new SimpleCommand(async ({ message }) => {
        const channels = message.mentions.channels;
        if (channels.size < 1) {
            return new Translation("disable.no_ch", "Uhm, I guess... but you gotta give me a channel or more to disable");
        }

        await database.collection("disabled_channels").updateOne({
            guildId: message.guild.id,
        }, {
            $addToSet: { channels: [...channels.array().map(c => c.id)] },
        }, { upsert: true });

        return new TranslationPlural("disable.success_ch", [
            "Channel {{channels}} will no longer listen to commands",
            "Channels {{channels}} will no longer listen to commands",
        ], { count: channels.size, channels: new ListFormat(channels.map(c => c.toString())) });
    })).setHelp(new HelpContent()
        .setUsage("<#channel>", "Disable Trixie from listening to a channel")
        .addParameter("#channel", "A channel or multiple channels"));

    disableCmd.registerSubCommand("command", new SimpleCommand(async ({ message, content }) => {
        const commandsRaw = content.toLowerCase().split(/\s+/g);
        if (commandsRaw.length < 1) {
            return new Translation("disable.no_cmd", "Uhm, I guess... but you gotta give me a command or more to disable");
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

        return new TranslationPlural("disable.success_cmd", [
            "Command {{commands}} will no longer listen",
            "Commands {{commands}} will no longer listen",
        ], { count: commands.length, commands: new ListFormat(commands) });
    })).setHelp(new HelpContent()
        .setUsage("<command name>", "Disable a command")
        .addParameter("command name", "The name of a command or a space seperated list of commands"));

    /**
     * ENABLE
     */
    const enableCmd = cr.registerCommand("enable", new TreeCommand)
        .setHelp(new HelpContent("If you have disabled channels or commands for Trixie, you can enable them here again."))
        .setCategory(Category.MODERATION);

    enableCmd.registerSubCommand("channel", new SimpleCommand(async ({ message }) => {
        const channels = message.mentions.channels;
        if (channels.size < 1) {
            return new Translation("enable.no_ch", "Uhm, I guess... but you gotta give me a channel or more to enable");
        }

        await database.collection("disabled_channels").updateOne({
            guildId: message.guild.id,
        }, {
            $pull: { channels: [...channels.array().map(c => c.id)] },
        });

        return new TranslationPlural("enable.success_ch", [
            "Channel {{channels}} will listen to commands again",
            "Channels {{channels}} will listen to commands again",
        ], { count: channels.size, channels: new ListFormat(channels.map(c => c.toString())) });
    })).setHelp(new HelpContent()
        .setUsage("<#channel>", "Enable Trixie from listening to a channel again")
        .addParameter("#channel", "A channel or multiple channels"));

    enableCmd.registerSubCommand("command", new SimpleCommand(async ({ message, content }) => {
        const commandsRaw = content.toLowerCase().split(/\s+/g);
        if (commandsRaw.length < 1) {
            return new Translation("enable.no_cmd", "Uhm, I guess... but you gotta give me a command or more to enable");
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

        return new TranslationPlural("enable.success_cmd", [
            "Command {{commands}} will listen again",
            "Commands {{commands}} will listen again",
        ], { count: commands.length, commands: new ListFormat(commands) });
    })).setHelp(new HelpContent()
        .setUsage("<command name>", "Enable a command again")
        .addParameter("command name", "The name of a command or a space seperated list of commands"));
};
