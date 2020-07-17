/*
 * Copyright (C) 2020 Christian Schäfer / Loneless
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

const log = require("../log").default.namespace("watch cmd");
import config from "../config";
import Discord from "discord.js";

import CommandRegistry from "../core/CommandRegistry";
import mongo from "mongodb";

import SimpleCommand from "../core/commands/SimpleCommand";
import OverloadCommand from "../core/commands/OverloadCommand";
import TreeCommand from "../core/commands/TreeCommand";
import HelpContent from "../util/commands/HelpContent";
import Category from "../util/commands/Category";
import CommandPermission from "../util/commands/CommandPermission";

import Translation from "../modules/i18n/Translation";

import WatchList from "../modules/watch/WatchList";
import Derpibooru from "../modules/Derpibooru";
import DerpiWatcher from "../modules/watch/watchers/DerpiWatcher";
import LocaleManager from "../core/managers/LocaleManager";
import HelpBuilder from "../util/commands/HelpBuilder";

export default function install(cr: CommandRegistry, { client, db, locale }: { client: Discord.Client, db: mongo.Db, locale: LocaleManager }): void {
    if (!config.has("derpibooru.key")) return log.namespace("config", "Found no API token for Derpibooru - Disabled watch command");

    const watch_managers = {
        derpi: new DerpiWatcher(client, db),
    };

    const watchCommand = cr.registerCommand("watch", new TreeCommand())
        .setHelp(new HelpContent()
            .setDescription("Automatically post new content from artists and content creators from Derpibooru (soon e621, furaffinity, deviantArt).")
            .setUsage("", "Show a list of all watches (watch triggers) added to this server."))
        .setCategory(Category.UTIL)
        .setPermissions(new CommandPermission([Discord.Permissions.FLAGS.MANAGE_CHANNELS]));

    watchCommand.registerDefaultCommand(new SimpleCommand(async ctx => {
        const watches = await watch_managers.derpi.getConfigs();

        await new WatchList(watches, ctx.channel as Discord.TextChannel, locale, ctx.author).display();
    }));

    watchCommand.registerSubCommandAlias("*", "list");

    /**
     * SUB COMMANDS
     */

    watchCommand.registerSubCommand("derpi", new OverloadCommand())
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const g_channel = message.mentions.channels.first() || message.channel;

            const tags = content.replace(/<#\d+>/, "").trim();

            await watch_managers.derpi.addConfig(g_channel as Discord.TextChannel, tags);

            if (g_channel.id === message.channel.id)
                return new Translation("watch.derpi.success_here", "Alright! I'll be posting all new uploads for {{tags}} here", {
                    tags: Derpibooru.resolveTags(tags).join(", "),
                });
            return new Translation("watch.derpi.success_there", "Alright! I'll be posting all new uploads for {{tags}} there", {
                tags: Derpibooru.resolveTags(tags).join(", "),
            });
        }))
        .setHelp(new HelpContent()
            .setUsage("<?channel> <tags>", "Subscribe to Derpibooru tags and Trixie automatically posts new uploads in `channel`.")
            .addParameterOptional("channel", "The channel to post new uploads into. If omitted: will be the current channel")
            .addParameter("tags", "The search query (e.g. `artist:loneless`). [__How to use Derpi search syntax__](https://derpibooru.org/pages/search_syntax)"));

    async function removeById(guild: Discord.Guild, id: number): Promise<Translation> {
        const is_removed = await watch_managers.derpi.removeConfig(guild, id);

        if (!is_removed)
            return new Translation("watch.derpi.remove_fail", "Watch trigger {{id}} doesn't exist.", {
                id: "#" + id,
            });
        return new Translation("watch.derpi.remove_success", "Removed watch trigger {{id}} successfully.", {
            id: "#" + id,
        });
    }

    watchCommand.registerSubCommand("remove", new OverloadCommand())
        .registerOverload("0", new SimpleCommand(async ({ message }) => {
            const watches = await watch_managers.derpi.getConfigs();

            const list = new WatchList(watches, message.channel as Discord.TextChannel, locale, message.author);
            await list.display();

            const msgs = await message.channel.awaitMessages(msg => msg.author.id === message.author.id && /^#?\d+$/.test(msg.content), { time: list.timeout, max: 1 });
            const msg = msgs.first();
            if (!msg) {
                list.end();
                return;
            }

            const id = parseInt(msg.content.startsWith("#") ? msg.content.substr(1) : msg.content);

            if (Number.isNaN(id)) return;

            return await removeById(message.guild!, id);
        }))
        .registerOverload("1", new SimpleCommand(async ({ message, content, ctx }, command_name) => {
            const id = parseInt(content.startsWith("#") ? content.substr(1) : content);

            if (Number.isNaN(id)) {
                await HelpBuilder.sendHelp(ctx, command_name, watchCommand);
                return;
            }

            await removeById(message.guild!, id);
        }))
        .setHelp(new HelpContent()
            .setUsage("<watch id>", "Remove watches (watch triggers) and stop posting updates for them.")
            .addParameterOptional("watch id", "The ID of the watch trigger to remove. If omitted: will show a list of all watch triggers and their IDs"));
}
