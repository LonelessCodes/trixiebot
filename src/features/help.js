const Discord = require("discord.js");
const packageFile = require("../../package.json");
const CONST = require("../modules/CONST");

const BaseCommand = require("../class/BaseCommand");
const AliasCommand = require("../class/AliasCommand");
const HelpBuilder = require("../logic/commands/HelpBuilder");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

function sortCommands(commands) {
    return Array.from(commands.keys()).sort().map(s => `\`${s}\``).join(", ");
}

module.exports = async function install(cr, client, config, database) {
    cr.register("help", new class extends BaseCommand {
        async call(message, content) {
            if (content !== "") {
                const toLowerCase = content.toLowerCase();
                const c = Array.from(cr.commands.entries()).find(([id,]) => id.toLowerCase() === toLowerCase);
                if (!c) return;

                let [name, command] = c;

                if (command instanceof AliasCommand) {
                    name = command.parentName;
                    command = command.command;
                }
                
                await HelpBuilder.sendHelp(message, name, command);
                return true;
            }

            const disabledCommands = await database.collection("disabled_commands").find({
                guildId: message.guild.id
            }).toArray();

            const categories = new Map;

            for (const [name, command] of cr.commands) {
                if (command instanceof AliasCommand) continue;
                if (disabledCommands.some(row => row.name === name)) continue;
                if (!command.list) continue;
                if (!command.category) continue;
                if (command.category === Category.OWNER) continue;

                if (!categories.has(command.category)) categories.set(command.category, new Map);
                categories.get(command.category).set(name, command);
            }

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

            embed.addField("Analysis Commands", sortCommands(categories.get(Category.ANALYSIS)));
            embed.addField("Action Commands", sortCommands(categories.get(Category.ACTION)));
            embed.addField("Text Modification Commands", sortCommands(categories.get(Category.TEXT)));
            embed.addField("Audio Commands", sortCommands(categories.get(Category.AUDIO)));
            // embed.addField("Currency Commands", sortCommands(categories.get(Category.CURRENCY)));
            embed.addField("Images Commands", sortCommands(categories.get(Category.IMAGE)));
            // embed.addField("Fun Commands", sortCommands(categories.get(Category.FUN)));
            embed.addField("Moderation Commands", sortCommands(categories.get(Category.MODERATION)));
            embed.addField("Info Commands", sortCommands(categories.get(Category.INFO)));
            embed.addField("Utility Commands", sortCommands(categories.get(Category.UTILS)));
            embed.addField("Misc Commands", sortCommands(categories.get(Category.MISC)));

            embed.setAuthor("TrixieBot Help", client.user.avatarURL);
            embed.setDescription(`**Command list**\nTo check command usage, type \`${message.guild.config.prefix}trixie help <command>\``);
            embed.setFooter(`TrixieBot v${packageFile.version} | Commands: ${cr.commands.size}`, client.user.avatarURL);

            await message.channel.send({ embed });

            return true;
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Haha, very funny")
            .setUsage("<?command>")
            .addParameterOptional("command", "The name of the command you want help for. Whole command list if omitted"))
        .setCategory(Category.INFO);
    cr.registerAlias("help", "trixie");
};