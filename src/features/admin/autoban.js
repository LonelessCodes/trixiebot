const CONST = require("../../modules/CONST");
const globToRegExp = require("glob-to-regexp");
const Discord = require("discord.js");

const BaseCommand = require("../../class/BaseCommand");
const TreeCommand = require("../../class/TreeCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const CommandPermission = require("../../logic/commands/CommandPermission");
const Category = require("../../logic/commands/Category");

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("autoban");

    client.on("guildMemberAdd", async member => {
        if (!member.bannable) return;

        const guild = member.guild;

        const conditions = await database.find({ guildId: guild.id }).toArray();
        const regexps = conditions.map(c => globToRegExp(c.pattern, { flags: "gi", extended: true }));

        const username = member.user.username;

        for (const regexp of regexps) {
            if (regexp.test(username)) {
                await member.ban("Banned because of autoban pattern");
                return;
            }
        }
    });

    const autobanCommand = cr.register("autoban", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Autoban allows admins to make sure to keep specific users out of the server, even if they create a new account*\nPatterns use the glob pattern documentation. It is an easy to understand text pattern matching solution. Check https://en.wikipedia.org/wiki/Glob_(programming)#Syntax for the info.\n\n* If in the pattern it's been made sure it would match these new similar accounts")
            .setUsage("", "view the autoban patterns of this server"))
        .setCategory(Category.MODERATION)
        .setPermissions(new CommandPermission.CommandPermission([Discord.Permissions.FLAGS.BAN_MEMBERS]));

    autobanCommand.registerSubCommand("add", new class extends BaseCommand {
        async call(message, content) {
            await database.insertOne({ guildId: message.guild.id, action: "ban", pattern: content });

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setDescription(`:police_car: Added \`${content}\` as a pattern`);

            await message.channel.send({ embed });
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<pattern>", "add a pattern banning joining users if they match it")
            .addParameter("pattern", "Pattern to filter out by"));

    autobanCommand.registerSubCommand("remove", new class extends BaseCommand {
        async call(message, content) {
            const deleted = await database.deleteOne({ guildId: message.guild.id, pattern: content });

            const embed = new Discord.RichEmbed();
            if (deleted.result.n === 0) {
                embed.setColor(CONST.COLOR.ERROR);
                embed.setDescription("No such pattern configured");
            } else {
                embed.setColor(CONST.COLOR.PRIMARY);
                embed.setDescription(`Deleted \`${content}\` as a pattern`);
            }

            await message.channel.send({ embed });
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<pattern>", "remove a pattern again"));

    autobanCommand.registerDefaultCommand(new class extends BaseCommand {
        async call(message) {
            const conditions = await database.find({ guildId: message.guild.id }).toArray();

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setTitle("Current AutoBan Patterns");
            embed.setDescription((conditions.length ?
                conditions.map(c => "`" + c.pattern + "`").join("\n") :
                "No autoban patterns yet. Add some by using `!autoban add <pattern>`") +
                "\n\n Patterns use the glob pattern documentation. It is an easy to understand text pattern matching solution. Check https://en.wikipedia.org/wiki/Glob_(programming)#Syntax for the info.");

            await message.channel.send({ embed });
        }
    });
};