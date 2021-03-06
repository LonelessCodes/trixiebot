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

const CONST = require("../../const").default;
const globToRegExp = require("glob-to-regexp");
const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const TreeCommand = require("../../core/commands/TreeCommand").default;
const HelpContent = require("../../util/commands/HelpContent").default;
const CommandPermission = require("../../util/commands/CommandPermission").default;
const Category = require("../../util/commands/Category").default;

const PaginatorGuildAction = require("../../modules/actions/PaginatorGuildAction");
const { basicTEmbed } = require("../../modules/i18n/TranslationEmbed");

const Translation = require("../../modules/i18n/Translation").default;
const TranslationEmbed = require("../../modules/i18n/TranslationEmbed").default;

/**
 * {
 *  guildId: string;
 *  type: "id" | "glob" | "regex" | "tag" | "name"
 *  action: "ban" | "kick"
 *  content: string;
 * }
 */

const ID_PATTERN = /^[0-9]+$/;

async function byID(database, message, id) {
    if (!ID_PATTERN.test(id)) {
        return new Translation("autoban.not_valid_id", "`{{id}}` is not a valid user ID. User IDs contain only digits. U dumbo", {
            id,
        });
    }

    await database.insertOne({ guildId: message.guild.id, action: "ban", type: "id", content: id });

    return new TranslationEmbed()
        .setColor(CONST.COLOR.PRIMARY)
        .setDescription(new Translation("autoban.added_id", ":police_car: Added `{{id}}` as an ID", { id }));
}

const TAG_PATTERN = /^([^@#:]{2,32})#([0-9]{4})$/;

async function byName(database, message, name) {
    const match = name.match(TAG_PATTERN);
    if (!match) {
        await database.insertOne({ guildId: message.guild.id, action: "ban", type: "name", content: name });

        return new TranslationEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setDescription(new Translation("autoban.added_name", ":police_car: Added `{{name}}`", { name }));
    }

    const user = message.client.users.cache.find(user => user.username === match[1] && user.discriminator === match[2]);
    if (!user) {
        await database.insertOne({ guildId: message.guild.id, action: "ban", type: "tag", content: name });

        return new TranslationEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setDescription(new Translation("autoban.added_name", ":police_car: Added `{{name}}`", { name }));
    }

    const id = user.id;
    await database.insertOne({ guildId: message.guild.id, action: "ban", type: "id", content: id });

    return new TranslationEmbed().setColor(CONST.COLOR.PRIMARY).setDescription(
        new Translation("autoban.added_as_id", ":police_car: Found `{{name}}`'s user ID. Added `{{id}}` as an ID", {
            name,
            id,
        })
    );
}

async function byGlob(database, message, pattern) {
    await database.insertOne({ guildId: message.guild.id, action: "ban", type: "glob", content: pattern });

    return new TranslationEmbed()
        .setColor(CONST.COLOR.PRIMARY)
        .setDescription(new Translation("autoban.added_pattern", ":police_car: Added `{{pattern}}` as a pattern", { pattern }));
}

async function byRegex(database, message, regex) {
    await database.insertOne({ guildId: message.guild.id, action: "ban", type: "regex", content: regex });

    return new TranslationEmbed()
        .setColor(CONST.COLOR.PRIMARY)
        .setDescription(
            new Translation("autoban.added_pattern", ":police_car: Added `{{pattern}}` as a pattern", { pattern: regex })
        );
}

module.exports = function install(cr, { client, db }) {
    const database = db.collection("autoban");
    database.createIndex({ guildId: 1, action: 1, type: 1, content: 1 }, { unique: 1 });

    client.on("guildMemberAdd", async member => {
        if (!member.bannable) return;

        const guild = member.guild;
        const user = member.user;

        const conditions = await database.find({ guildId: guild.id }).toArray();

        for (const c of conditions) {
            const ban = () => member.ban(`Banned due to autoban configuration: ${c.type} | ${c.content}`);

            switch (c.type) {
                case "id":
                    if (user.id === c.content) return await ban();
                    break;
                case "tag": {
                    const [username, discriminator] = c.content.split("#");
                    if (user.username === username && user.discriminator === discriminator) return await ban();
                    break;
                }
                case "name":
                    if (user.username.toLowerCase() === c.content.toLowerCase()) return await ban();
                    break;
                case "glob": {
                    const regex = globToRegExp(c.content, { flags: "i", extended: true });
                    if (regex.test(user.username)) return await ban();
                    break;
                }
                case "regex": {
                    const regex = new RegExp(c.content, "ui");
                    if (regex.test(user.username)) return await ban();
                    break;
                }
            }
        }
    });

    /**
     * COMMAND
     */

    const autobanCmd = cr
        .registerCommand("autoban", new TreeCommand())
        .setHelp(
            new HelpContent()
                .setDescription(
                    "Autoban allows admins to make sure to keep specific users out of the server, even if they create a new account.\n\nGlob is an easy to understand text pattern matching solution. Check https://en.wikipedia.org/wiki/Glob_(programming)#Syntax for the info.\nPatterns use the RegEx specification. Infos on RegEx can be found here: https://regexr.com/. A good sandbox for RegEx tooling is https://regex101.com/"
                )
                .setUsage("<? userID|username#0000|username>", "view the autoban patterns of this server")
                .addParameterOptional("userID|username#0000|username", "If given, add an autoban configuration")
        )
        .setCategory(Category.MODERATION)
        .setPermissions(new CommandPermission([Discord.Permissions.FLAGS.BAN_MEMBERS]));

    autobanCmd
        .registerDefaultCommand(new OverloadCommand())
        .registerOverload(
            "0",
            new SimpleCommand(async context => {
                /**
                 * LIST ALL BAN AND KICK CONFIGS
                 */
                const conditions = await database.find({ guildId: context.guild.id }).toArray();
                if (conditions.length === 0) {
                    return basicTEmbed("Autobans", context.guild).setDescription(
                        new Translation(
                            "autoban.no_configs",
                            "No autoban configs yet. Add some by using `{{prefix}}autoban <userID/username#0000/glob>`",
                            { prefix: context.prefix }
                        )
                    );
                }

                const items = conditions.map(row => `\`${(row.type + "   ").slice(0, 5)}\` | \`${row.content}\``);

                await new PaginatorGuildAction(
                    new Translation("autoban.title", "Autobans"),
                    new Translation("autoban.all_configs", "All the configured autobans for this server"),
                    items,
                    context.author,
                    context.guild,
                    { items_per_page: 20 }
                ).display(context.channel, await context.translator());
            })
        )
        .registerOverload(
            "1+",
            new SimpleCommand(({ content, message }) => {
                if (ID_PATTERN.test(content)) return byID(database, message, content);
                return byName(database, message, content);
            })
        );

    autobanCmd
        .registerSubCommand(
            "id",
            new SimpleCommand(({ message, content }) => {
                if (content === "") return;
                return byID(database, message, content.trim());
            })
        )
        .setHelp(
            new HelpContent().setUsage("<userID>", "add an autoban config banning the user with this specific, unique userID")
        );

    autobanCmd
        .registerSubCommand(
            "name",
            new SimpleCommand(({ message, content }) => {
                if (content === "") return;
                return byName(database, message, content.trim());
            })
        )
        .setHelp(
            new HelpContent().setUsage(
                "<username#0000|username>",
                "add an autoban config banning the user with this user tag (username#0000) or, if passed a username only, this username (case insensitive)"
            )
        );

    autobanCmd
        .registerSubCommand(
            "glob",
            new SimpleCommand(({ message, content }) => {
                if (content === "") return;
                return byGlob(database, message, content.trim());
            })
        )
        .setHelp(
            new HelpContent().setUsage(
                "<glob>",
                "add an autoban config banning users matching this glob pattern (always case insensitive)"
            )
        );

    autobanCmd
        .registerSubCommand(
            "regexp",
            new SimpleCommand(({ message, content }) => {
                if (content === "") return;
                return byRegex(database, message, content.trim());
            })
        )
        .setHelp(
            new HelpContent().setUsage(
                "<regexp>",
                "add an autoban config banning users matching this RegEx pattern (always with i and u flags)"
            )
        );

    autobanCmd.registerSubCommandAlias("regexp", "regex");

    autobanCmd
        .registerSubCommand("remove", new OverloadCommand())
        .setHelp(
            new HelpContent()
                .setUsageTitle("Remove configs:")
                .setUsage(
                    "<?thing>",
                    "remove an autoban again. If no args given, returns a numbered list of autobans to choose from"
                )
        )

        .registerOverload(
            "0",
            new SimpleCommand(async context => {
                const conditions = await database.find({ guildId: context.guild.id }).toArray();
                if (!conditions.length) {
                    return basicTEmbed("Autobans", context.guild).setDescription(
                        new Translation(
                            "autoban.no_configs",
                            "No autoban configs yet. Add some by using `{{prefix}}autoban <userID|username#0000|glob>`",
                            { prefix: context.prefix }
                        )
                    );
                }

                const items = conditions.map(row => `\`${(row.type + "   ").slice(0, 5)}\` | \`${row.content}\``);

                const paginator = new PaginatorGuildAction(
                    new Translation("autoban.remove.title", "Removable Autobans"),
                    new Translation("autoban.remove_configs", "Type the number of the autoban you would like to remove."),
                    items,
                    context.author,
                    context.guild,
                    { items_per_page: 20, number_items: true }
                );
                const paginator_msg = await paginator.display(context.channel, await context.translator());

                const msgs = await context.channel.awaitMessages(
                    m => m.author.id === context.author.id && /[0-9]+/.test(m.content),
                    { max: 1, time: 60000 }
                );
                if (msgs.size > 0) {
                    const m = msgs.first();
                    const num = parseInt(m.content) - 1;
                    if (!Number.isNaN(num) && num < conditions.length) {
                        const row = conditions[num];

                        await database.deleteOne({ _id: row._id });

                        const embed = new TranslationEmbed()
                            .setColor(CONST.COLOR.PRIMARY)
                            .setDescription(
                                new Translation("autoban.deleted", "Deleted `{{id}}` :rotating_light:", { id: row.content })
                            );

                        await context.send(embed);
                    }
                }

                await paginator.end(paginator_msg);
            })
        )
        .registerOverload(
            "1+",
            new SimpleCommand(async ({ guild, content }) => {
                const deleted = await database.deleteOne({ guildId: guild.id, content: content });

                if (deleted.result.n === 0) {
                    return new TranslationEmbed()
                        .setColor(CONST.COLOR.ERROR)
                        .setDescription(new Translation("autoban.no_parameter", "No such pattern configured"));
                }

                return new TranslationEmbed()
                    .setColor(CONST.COLOR.PRIMARY)
                    .setDescription(new Translation("autoban.deleted", "Deleted `{{id}}` :rotating_light:", { id: content }));
            })
        );

    autobanCmd.registerSubCommandAlias("*", "list");
};
