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
const CategoryClass = Category.Category;

const Translation = require("../../modules/i18n/Translation").default;
const TranslationPlural = require("../../modules/i18n/TranslationPlural").default;
const ListFormat = require("../../modules/i18n/ListFormat").default;
const { ResolvableObject } = require("../../modules/i18n/Resolvable");

// disabled channels
// disabled commands
// disabled commands in channels
// disabled categories
// disabled categories in channels

module.exports = function install(cr, { db }) {
    const disabled_chs = db.collection("disabled_channels");
    const disabled_cmds = db.collection("disabled_commands");
    const disabled_cats = db.collection("disabled_categories");

    /**
     * DISABLE
     */
    const disableCmd = cr.registerCommand("disable", new TreeCommand)
        .setHelp(new HelpContent("Disable Trixie from listening to some commands or channels"))
        .setCategory(Category.CONFIG);

    disableCmd.registerDefaultCommand(new HelpCommand);

    disableCmd.registerSubCommand("channel", new SimpleCommand(async ({ message }) => {
        const channels = message.mentions.channels;
        if (channels.size < 1) {
            return new Translation("disable.no_ch", "Uhm, I guess... but you gotta give me a channel or more to disable");
        }

        await disabled_chs.updateOne({
            guildId: message.guild.id,
        }, {
            $addToSet: {
                channels: { $each: channels.map(c => c.id) },
            },
        }, { upsert: true });

        return new TranslationPlural("disable.success_ch", [
            "Channel {{channels}} will no longer listen to commands",
            "Channels {{channels}} will no longer listen to commands",
        ], { count: channels.size, channels: new ListFormat(channels.map(c => c.toString())) });
    })).setHelp(new HelpContent()
        .setUsage("<#channel>", "Disable Trixie from listening to a channel")
        .addParameter("#channel", "A channel or multiple channels"));

    disableCmd.registerSubCommand("command", new SimpleCommand(async ({ message, content }) => {
        const commandsRaw = content.toLowerCase().split(/\s+/g).filter(c => c !== "");
        if (commandsRaw.length < 1) {
            return new Translation("disable.no_cmd", "Uhm, I guess... but you gotta give me a command or more to disable");
        }

        const commands = [];
        const dontExist = [];
        for (const name of commandsRaw) {
            if (cr.commands.has(name)) commands.push(name);
            else dontExist.push(name);
        }

        await disabled_cmds.updateOne({
            guildId: message.guild.id,
        }, {
            $addToSet: {
                commands: { $each: commands },
            },
        }, { upsert: true });

        return new TranslationPlural("disable.success_cmd", [
            "Command {{commands}} will no longer listen",
            "Commands {{commands}} will no longer listen",
        ], { count: commands.length, commands: new ListFormat(commands) });
    })).setHelp(new HelpContent()
        .setUsage("<command name>", "Disable a command")
        .addParameter("command name", "The name of a command or a space seperated list of commands"));

    disableCmd.registerSubCommand("category", new SimpleCommand(async ({ message, content, ctx }) => {
        const categoriesRaw = content.toLowerCase().split(/\s+/g).filter(c => c !== "");
        if (categoriesRaw.length < 1) {
            return new Translation("disable.no_category", "Uhm, I guess... but you gotta give me a category or more to disable");
        }

        const trans = await ctx.translator();
        /** @type {Map<string, CategoryClass>} */
        const all_categories = new Map;
        for (let category of Object.keys(Category).filter(c => Category[c] instanceof CategoryClass).map(c => Category[c])) {
            all_categories.set(category.name.phrase.toLowerCase(), category);
            all_categories.set(Resolvable.resolve(category.name, trans).toLowerCase(), category);
        }

        /** @type {CategoryClass[]} */
        const categories = [];
        const dontExist = [];
        for (const name of categoriesRaw) {
            if (all_categories.has(name)) categories.push(all_categories.get(name));
            else dontExist.push(name);
        }

        await disabled_cats.updateOne({
            guildId: message.guild.id,
        }, {
            $addToSet: {
                categories: { $each: categories.map(c => c.id) },
            },
        }, { upsert: true });

        return new TranslationPlural("disable.success_cat", [
            "Commands in category {{categories}} will no longer listen",
            "Commands in categories {{categories}} will no longer listen",
        ], { count: categories.length, categories: new ListFormat(categories.map(c => c.name)) });
    })).setHelp(new HelpContent()
        .setUsage("<category name>", "Disable a category of commands")
        .addParameter("category name", "The name of a category or a space seperated list of categories"));

    /**
     * ENABLE
     */
    const enableCmd = cr.registerCommand("enable", new TreeCommand)
        .setHelp(new HelpContent("If you have disabled channels or commands for Trixie, you can enable them here again."))
        .setCategory(Category.CONFIG);

    enableCmd.registerSubCommand("channel", new SimpleCommand(async ({ message }) => {
        const channels = message.mentions.channels;
        if (channels.size < 1) {
            return new Translation("enable.no_ch", "Uhm, I guess... but you gotta give me a channel or more to enable");
        }

        await disabled_chs.updateOne({
            guildId: message.guild.id,
        }, {
            $pullAll: { channels: channels.array().map(c => c.id) },
        });

        return new TranslationPlural("enable.success_ch", [
            "Channel {{channels}} will listen to commands again",
            "Channels {{channels}} will listen to commands again",
        ], { count: channels.size, channels: new ListFormat(channels.map(c => c.toString())) });
    })).setHelp(new HelpContent()
        .setUsage("<#channel>", "Enable Trixie from listening to a channel again")
        .addParameter("#channel", "A channel or multiple channels"));

    enableCmd.registerSubCommand("command", new SimpleCommand(async ({ message, content }) => {
        const commandsRaw = content.toLowerCase().split(/\s+/g).filter(c => c !== "");
        if (commandsRaw.length < 1) {
            return new Translation("enable.no_cmd", "Uhm, I guess... but you gotta give me a command or more to enable");
        }

        const commands = [];
        const dontExist = [];
        for (const name of commandsRaw) {
            if (cr.commands.has(name)) commands.push(name);
            else dontExist.push(name);
        }

        await disabled_cmds.updateOne({
            guildId: message.guild.id,
        }, {
            $pullAll: { commands: commands },
        });

        return new TranslationPlural("enable.success_cmd", [
            "Command {{commands}} will listen again",
            "Commands {{commands}} will listen again",
        ], { count: commands.length, commands: new ListFormat(commands) });
    })).setHelp(new HelpContent()
        .setUsage("<command name>", "Enable a command again")
        .addParameter("command name", "The name of a command or a space seperated list of commands"));

    enableCmd.registerSubCommand("category", new SimpleCommand(async ({ message, content, ctx }) => {
        const categoriesRaw = content.toLowerCase().split(/\s+/g).filter(c => c !== "");
        if (categoriesRaw.length < 1) {
            return new Translation("enable.no_category", "Uhm, I guess... but you gotta give me a category or more to enable");
        }

        const trans = await ctx.translator();
        /** @type {Map<string, CategoryClass>} */
        const all_categories = new Map;
        for (let category of Object.keys(Category).filter(c => Category[c] instanceof CategoryClass).map(c => Category[c])) {
            all_categories.set(category.name.phrase.toLowerCase(), category);
            all_categories.set(Resolvable.resolve(category.name, trans).toLowerCase(), category);
        }

        /** @type {CategoryClass[]} */
        const categories = [];
        const dontExist = [];
        for (const name of categoriesRaw) {
            if (all_categories.has(name)) categories.push(all_categories.get(name));
            else dontExist.push(name);
        }

        await disabled_cats.updateOne({
            guildId: message.guild.id,
        }, {
            $pullAll: { categories: categories.map(c => c.id) },
        });

        return new TranslationPlural("disable.success_cat", [
            "Commands in category {{categories}} will listen again",
            "Commands in categories {{categories}} will listen again",
        ], { count: categories.length, categories: new ListFormat(categories.map(c => c.name)) });
    })).setHelp(new HelpContent()
        .setUsage("<category name>", "Enable a category of commands again")
        .addParameter("category name", "The name of a category or a space seperated list of categories"));
};
