const Discord = require("discord.js");
const INFO = require("../info");
const CONST = require("../const");

const SimpleCommand = require("../class/SimpleCommand");
const OverloadCommand = require("../class/OverloadCommand");
const TreeCommand = require("../class/TreeCommand");
const AliasCommand = require("../class/AliasCommand");
const HelpBuilder = require("../logic/commands/HelpBuilder");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");
// eslint-disable-next-line no-unused-vars
const CategoryClass = Category.Category;

function sortCommands(commands) {
    return Array.from(commands.keys()).sort().map(s => `\`${s}\``).join(", ");
}

module.exports = async function install(cr, client, config, database) {
    cr.registerCommand("help", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            let query = content.toLowerCase();
            let path = [];
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
                        await HelpBuilder.sendHelp(message, path.join(" "), command);
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
        }))
        .registerOverload("0", new SimpleCommand(async message => {
            const disabledCommands = await database.collection("disabled_commands").find({
                guildId: message.guild.id
            }).toArray();

            const custom_commands = await cr.cc.getCommands(message.guild.id, message.channel.id);

            /** @type {Map<CategoryClass, Map<string, BaseCommand>>} */
            const categories = new Map;

            for (const [name, command] of cr.commands) {
                if (command instanceof AliasCommand) continue;
                if (!command.hasScope(message.channel)) continue;
                if (disabledCommands.some(row => row.name === name)) continue;
                if (!message.channel.nsfw && command.explicit) continue;
                if (!command.list) continue;
                if (!command.category) continue;
                if (command.category === Category.OWNER) continue;

                if (!categories.has(command.category)) categories.set(command.category, new Map);
                categories.get(command.category).set(name, command);
            }

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

            if (custom_commands.length > 0) {
                embed.addField("Custom Commands", custom_commands.map(c => c.trigger).sort().map(s => `\`${s}\``).join(", "));
            }

            const ordered = [
                Category.MLP,
                Category.ANALYSIS,
                Category.ACTION,
                Category.TEXT,
                Category.AUDIO,
                Category.CURRENCY,
                Category.IMAGE,
                Category.FUN,
                Category.MODERATION,
                Category.INFO,
                Category.UTILS,
                Category.MISC
            ];

            for (const cat of ordered) {
                const commands = categories.get(cat);
                if (commands && commands.size > 0) {
                    embed.addField(cat.toString() + " Commands", sortCommands(commands));
                }
            }

            embed.setAuthor("TrixieBot Help", client.user.avatarURL);
            embed.setDescription(`**Command list**
Required Argument: \`<arg>\`
Optional Argument: \`<?arg>\`
@-Mentions can be replaced through a username and a tag or part of a username:
\`${message.guild.config.prefix}whois @Loneless#0893 / Loneless#0893 / Lone\`
To check command usage, type \`${message.guild.config.prefix}help <command>\``);
            embed.setFooter(`TrixieBot v${INFO.VERSION} | Commands: ${cr.commands.size}`, client.user.avatarURL);

            return { embed };
        }))
        .setHelp(new HelpContent()
            .setDescription("Haha, very funny")
            .setUsage("<?command>")
            .addParameterOptional("command", "The name of the command you want help for. Whole command list if omitted"))
        .setCategory(Category.INFO);
    cr.registerAlias("help", "h");
};