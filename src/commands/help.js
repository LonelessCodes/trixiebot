/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

const Discord = require("discord.js");
const INFO = require("../info").default;
const CONST = require("../const").default;

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const TreeCommand = require("../core/commands/TreeCommand").default;
const AliasCommand = require("../core/commands/AliasCommand");
// eslint-disable-next-line no-unused-vars
const BaseCommand = require("../core/commands/BaseCommand").default;
const HelpBuilder = require("../util/commands/HelpBuilder").default;
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const CommandScope = require("../util/commands/CommandScope").default;

function sortCommands(commands) {
    return Array.from(commands.keys())
        .sort()
        .map(s => `\`${s}\``)
        .join(", ");
}

const ordered = [];
for (const key in Category) if (Category[key] instanceof Category) ordered.push(Category[key]);

module.exports = function install(cr, { client, db: database }) {
    cr.registerCommand("help", new OverloadCommand())
        .registerOverload(
            "1+",
            new SimpleCommand(async ({ message, content, ctx }) => {
                let query = content.toLowerCase();
                const path = [];
                /** @type {Map<string, BaseCommand>} */
                let cmd_map = cr.commands;
                while (cmd_map != null) {
                    let found = false;
                    for (let [name, command] of cmd_map) {
                        if (!query.startsWith(name.toLowerCase())) continue;

                        query = query.slice(name.length).trim();

                        if (command instanceof AliasCommand) {
                            name = command.parentName;
                            command = command.command;
                        }
                        if (!command.hasScope(message.channel)) continue;

                        path.push(name);

                        if (query === "") {
                            await HelpBuilder.sendHelp(ctx, path.join(" "), command);
                            return;
                        }

                        if (command instanceof TreeCommand) {
                            cmd_map = command.sub_commands;
                            found = true;
                        }
                        break;
                    }

                    if (!found) return;
                }
            })
        )
        .registerOverload(
            "0",
            new SimpleCommand(async ({ message, prefix }) => {
                const is_guild = message.channel.type === "text";
                const is_dm = message.channel.type === "dm";

                const disabledCommands = is_guild
                    ? (await database.collection("disabled_commands").findOne({
                          guildId: message.guild.id,
                      })) || { commands: [] }
                    : { commands: [] };
                const disabledCategories = is_guild
                    ? (await database.collection("disabled_categories").findOne({
                          guildId: message.guild.id,
                      })) || { categories: [] }
                    : { categories: [] };

                const custom_commands = is_guild ? await cr.CC.getCommands(message.guild.id, message.channel.id) : [];

                /** @type {Map<Category, Map<string, BaseCommand>>} */
                const categories = new Map();

                for (const [name, command] of cr.commands) {
                    if (command instanceof AliasCommand) continue;
                    if (!command.hasScope(message.channel)) continue;
                    if (disabledCommands.commands.includes(name)) continue;
                    if (!message.channel.nsfw && command.explicit) continue;
                    if (!command.listed) continue;
                    if (!command.category) continue;
                    if (command.category === Category.OWNER) continue;

                    if (!categories.has(command.category)) categories.set(command.category, new Map());
                    categories.get(command.category).set(name, command);
                }

                const embed = new Discord.MessageEmbed().setColor(CONST.COLOR.PRIMARY);

                if (custom_commands.length > 0) {
                    embed.addField(
                        "Custom Commands",
                        custom_commands
                            .map(c => c.trigger)
                            .sort()
                            .map(s => `\`${s}\``)
                            .join(", ")
                    );
                }

                for (const cat of ordered.filter(c => !disabledCategories.categories.includes(c.id))) {
                    const commands = categories.get(cat);
                    if (commands && commands.size > 0) {
                        embed.addField(cat.toString() + " Commands", sortCommands(commands));
                    }
                }

                embed.setAuthor("TrixieBot Help", client.user.avatarURL({ size: 32, dynamic: true }));
                embed.setDescription(
                    "**Command list**\n" +
                        "Required Argument: `<arg>`\n" +
                        "Optional Argument: `<?arg>`\n" +
                        (!is_dm
                            ? "@-Mentions can be replaced through a username and a tag or part of a username:\n" +
                              `\`${prefix}whois @Loneless#0893 / Loneless#0893 / Lone\`\n`
                            : "") +
                        `To check command usage, type \`${prefix}help <command>\``
                );
                embed.setFooter(
                    `TrixieBot v${INFO.VERSION} | Commands: ${cr.commands.size}`,
                    client.user.avatarURL({ size: 32, dynamic: true })
                );

                return { embed };
            })
        )
        .setHelp(
            new HelpContent()
                .setUsage("<?command>", "Haha, very funny")
                .addParameterOptional("command", "The name of the command you want help for. Whole command list if omitted")
        )
        .setCategory(Category.INFO)
        .setScope(CommandScope.ALL);
    cr.registerAlias("help", "h");
};
