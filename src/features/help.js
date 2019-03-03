const Discord = require("discord.js");
const INFO = require("../info");
const CONST = require("../modules/CONST");

const BaseCommand = require("../class/BaseCommand");
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

            /** @type {Map<CategoryClass, Map<string, BaseCommand>>} */
            const categories = new Map;

            for (const [name, command] of cr.commands) {
                if (command instanceof AliasCommand) continue;
                if (disabledCommands.some(row => row.name === name)) continue;
                if (!message.channel.nsfw && command.explicit) continue;
                if (!command.list) continue;
                if (!command.category) continue;
                if (command.category === Category.OWNER) continue;

                if (!categories.has(command.category)) categories.set(command.category, new Map);
                categories.get(command.category).set(name, command);
            }

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

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

            await message.channel.send({ embed });

            return true;
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Haha, very funny")
            .setUsage("<?command>")
            .addParameterOptional("command", "The name of the command you want help for. Whole command list if omitted"))
        .setCategory(Category.INFO);
    cr.registerAlias("help", "h");
};