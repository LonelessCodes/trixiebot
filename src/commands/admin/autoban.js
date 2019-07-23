const CONST = require("../../const");
const globToRegExp = require("glob-to-regexp");
const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const Category = require("../../util/commands/Category");

const Paginator = require("../../util/commands/Paginator");
const { basicEmbed } = require("../../util/util");

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
        await message.channel.send(`"${id}" is not a valid user ID. User IDs contain only digits. U dumbo`);
        return;
    }

    await database.insertOne({ guildId: message.guild.id, action: "ban", type: "id", content: id });

    const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
    embed.setDescription(`:police_car: Added \`${id}\` as an ID`);

    await message.channel.send({ embed });
}

const TAG_PATTERN = /^([^@#:]{2,32})#([0-9]{4})$/;

/**
 * @param {any} database
 * @param {Message} message
 * @param {string} name
 * @returns {void}
 */
async function byName(database, message, name) {
    const match = name.match(TAG_PATTERN);
    if (!match) {
        await database.insertOne({ guildId: message.guild.id, action: "ban", type: "name", content: name });

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        embed.setDescription(`:police_car: Added \`${name}\``);

        await message.channel.send({ embed });
        return;
    }

    const user = message.client.users.find(user => user.username === match[1] && user.discriminator === match[2]);
    if (!user) {
        await database.insertOne({ guildId: message.guild.id, action: "ban", type: "tag", content: name });

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        embed.setDescription(`:police_car: Added \`${name}\``);

        await message.channel.send({ embed });
        return;
    }

    const id = user.id;
    await database.insertOne({ guildId: message.guild.id, action: "ban", type: "id", content: id });

    const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
    embed.setDescription(`:police_car: Found \`${name}\`'s user ID. Added \`${id}\` as an ID`);

    await message.channel.send({ embed });
}

async function byGlob(database, message, pattern) {
    await database.insertOne({ guildId: message.guild.id, action: "ban", type: "glob", content: pattern });

    const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
    embed.setDescription(`:police_car: Added \`${pattern}\` as a pattern`);

    await message.channel.send({ embed });
}

async function byRegex(database, message, regex) {
    await database.insertOne({ guildId: message.guild.id, action: "ban", type: "regex", content: regex });

    const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
    embed.setDescription(`:police_car: Added \`${regex}\` as a pattern`);

    await message.channel.send({ embed });
}

module.exports = function install(cr, client, config, db) {
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
                case "id": if (user.id === c.content) return await ban(); else break;
                case "tag": {
                    const [username, discriminator] = c.content.split("#");
                    if (user.username === username && user.discriminator === discriminator) return await ban(); else break;
                }
                case "name": if (user.username.toLowerCase() === c.content.toLowerCase()) return await ban(); else break;
                case "glob": {
                    const regex = globToRegExp(c.content, { flags: "i", extended: true });
                    if (regex.test(user.username)) return await ban(); else break;
                }
                case "regex": {
                    const regex = new RegExp(c.content, "ui");
                    if (regex.test(user.username)) return await ban(); else break;
                }
            }
        }
    });

    /**
     * COMMAND
     */

    const autobanCmd = cr.registerCommand("autoban", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Autoban allows admins to make sure to keep specific users out of the server, even if they create a new account.\n\nGlob is an easy to understand text pattern matching solution. Check https://en.wikipedia.org/wiki/Glob_(programming)#Syntax for the info.\nPatterns use the RegEx specification. Infos on RegEx can be found here: https://regexr.com/. A good sandbox for RegEx tooling is https://regex101.com/")
            .setUsage("<? userID|username#0000|username>", "view the autoban patterns of this server")
            .addParameterOptional("userID|username#0000|username", "If given, add an autoban configuration"))
        .setCategory(Category.MODERATION)
        .setPermissions(new CommandPermission([Discord.Permissions.FLAGS.BAN_MEMBERS]));

    autobanCmd.registerDefaultCommand(new OverloadCommand)
        .registerOverload("0", new SimpleCommand(async message => {
            /**
             * LIST ALL BAN AND KICK CONFIGS
             */
            const conditions = await database.find({ guildId: message.guild.id }).toArray();
            if (!conditions.length) {
                await message.channel.send({
                    embed: basicEmbed("Autobans", message.guild)
                        .setDescription("No autoban configs yet. Add some by using `!autoban <userID|username#0000|glob>`"),
                });
                return;
            }

            const items = conditions.map(row => `\`${(row.type + "   ").slice(0, 5)}\` | \`${row.content}\``);

            return new Paginator(
                "Autobans",
                "All the configured autobans for this server",
                20, items, message.author,
                { guild: message.guild }
            ).display(message.channel);
        }))
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            if (ID_PATTERN.test(content)) await byID(database, message, content);
            else await byName(database, message, content);
        }));

    autobanCmd.registerSubCommand("id", new SimpleCommand(async (message, content) => {
        if (content === "") return;
        await byID(database, message, content.trim());
    })).setHelp(new HelpContent()
        .setUsage("<userID>", "add an autoban config banning the user with this specific, unique userID"));

    autobanCmd.registerSubCommand("name", new SimpleCommand(async (message, content) => {
        if (content === "") return;
        await byName(database, message, content.trim());
    })).setHelp(new HelpContent()
        .setUsage("<username#0000|username>", "add an autoban config banning the user with this user tag (username#0000) or, if passed a username only, this username (case insensitive)"));

    autobanCmd.registerSubCommand("glob", new SimpleCommand(async (message, content) => {
        if (content === "") return;
        await byGlob(database, message, content.trim());
    })).setHelp(new HelpContent()
        .setUsage("<glob>", "add an autoban config banning users matching this glob pattern (always case insensitive)"));

    autobanCmd.registerSubCommand("regexp", new SimpleCommand(async (message, content) => {
        if (content === "") return;
        await byRegex(database, message, content.trim());
    })).setHelp(new HelpContent()
        .setUsage("<regexp>", "add an autoban config banning users matching this RegEx pattern (always with i and u flags)"));

    autobanCmd.registerSubCommandAlias("regexp", "regex");

    autobanCmd.registerSubCommand("remove", new OverloadCommand)
        .setHelp(new HelpContent()
            .setUsageTitle("Remove configs:")
            .setUsage("<?thing>", "remove an autoban again. If no args given, returns a numbered list of autobans to choose from"))

        .registerOverload("0", new SimpleCommand(async message => {
            const conditions = await database.find({ guildId: message.guild.id }).toArray();
            if (!conditions.length) {
                await message.channel.send({
                    embed: basicEmbed("Autobans", message.guild)
                        .setDescription("No autoban configs yet. Add some by using `!autoban <userID|username#0000|glob>`"),
                });
                return;
            }

            const items = conditions.map(row => `\`${(row.type + "   ").slice(0, 5)}\` | \`${row.content}\``);

            const paginator = new Paginator(
                "Removable Autobans",
                "Type the number of the autoban you would like to remove.",
                20, items, message.author,
                { number_items: true, guild: message.guild }
            ).display(message.channel);

            const msgs = await message.channel.awaitMessages(m => m.author.id === message.author.id && /[0-9]+/.test(m.content), { maxMatches: 1, time: 60000 });
            if (msgs.size > 0) {
                const m = msgs.first();
                const num = parseInt(m.content) - 1;
                if (!Number.isNaN(num) && num < conditions.length) {
                    const row = conditions[num];

                    await database.deleteOne({ _id: row._id });

                    const embed = new Discord.RichEmbed()
                        .setColor(CONST.COLOR.PRIMARY)
                        .setDescription(`Deleted \`${row.content}\` :rotating_light:`);

                    await message.channel.send({ embed });
                }
            }

            await paginator.end();
        }))
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            const deleted = await database.deleteOne({ guildId: message.guild.id, content: content });

            const embed = new Discord.RichEmbed();
            if (deleted.result.n === 0) {
                embed.setColor(CONST.COLOR.ERROR);
                embed.setDescription("No such pattern configured");
            } else {
                embed.setColor(CONST.COLOR.PRIMARY);
                embed.setDescription(`Deleted \`${content}\` :rotating_light:`);
            }

            await message.channel.send({ embed });
        }));

    autobanCmd.registerSubCommandAlias("*", "list");
};
