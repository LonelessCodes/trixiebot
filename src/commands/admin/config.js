const { splitArgs, findArgs } = require("../../util/string");
const CONST = require("../../const");
const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const Category = require("../../util/commands/Category");

const types_human = new Map([
    [String, "Text"],
    [Number, "Number"],
    [Boolean, "true or false"],
    [Discord.TextChannel, "\\#Channel"],
    [Discord.Role, "Role Name"],
    [Discord.GuildMember, "\\@User"]
]);

module.exports = async function install(cr, client, config) {
    cr.registerCommand("config", new OverloadCommand)
        .setHelp(new HelpContent()
            .setUsage("<?parameter> <?value>", "view the Trixie's config in this server")
            .addParameterOptional("parameter", "view only this parameter's config")
            .addParameterOptional("value", "set a parameter in Trixie's config. \"default\" for default config"))
        .setCategory(Category.MODERATION)
        .setPermissions(CommandPermission.ADMIN)

        .registerOverload("0", new SimpleCommand(async message => {
            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setTitle(message.guild.name);
            embed.setThumbnail(message.guild.iconURL);

            embed.setDescription("Use the command format !config <option> to view more info about an option.");

            const parameters = config.parameters;

            for (let i = 0; i < parameters.length; i++) {
                let parameter = parameters[i];

                if (parameter.name instanceof Array) {
                    let str = "";
                    for (let j = 0; j < parameter.name.length; j++) {
                        let sub = parameter.name[j];
                        sub.position = j;

                        str += `\`${message.prefix}config ${sub.name}\` - ${sub.humanName}\n`;
                    }
                    embed.addField(parameter.humanName, str, true);
                } else {
                    embed.addField(parameter.humanName, `\`${message.prefix}config ${parameter.name}\``, true);
                }
            }

            await message.channel.send({ embed });
        }))
        .registerOverload("1", new SimpleCommand(async (message, arg) => {
            const embed = new Discord.RichEmbed;

            const find = () => {
                let rtn;
                const find = function find(p) {
                    if (p.name instanceof Array) return p.name.find(find);
                    if (p.name === arg) rtn = p;
                };
                config.parameters.find(find);
                return rtn;
            };
            const parameter = find();

            if (!parameter) {
                embed.setColor(CONST.COLOR.ERROR);
                embed.setDescription(await message.channel.translate("No such parameter. *shrugs*"));
            } else {
                embed.setColor(CONST.COLOR.PRIMARY);
                embed.setThumbnail(message.guild.iconURL);
                embed.setTitle(parameter.humanName);

                const value = await config.get(message.guild.id, arg);
                const human_readable = parameter.human(value);
                embed.addField("Currently:", `\`${human_readable}\``);
                embed.addField("Update:", `\`${message.prefix}config ${parameter.name} <new value>\``);
                embed.addField("Allowed Types:", parameter.types.map(t => {
                    return types_human.get(t) || `\`${t}\``;
                }).join(", ") + (parameter.allowEmpty ? " or `none`" : ""));
            }

            await message.channel.send({ embed });
        }))
        .registerOverload("2+", new SimpleCommand(async (message, content) => {
            const args = splitArgs(content, 2);
            const value = findArgs(args[1])[0];

            const embed = new Discord.RichEmbed;

            const find = () => {
                let rtn;
                const find = function find(p) {
                    if (p.name instanceof Array) return p.name.find(find);
                    if (p.name === args[0]) rtn = p;
                };
                config.parameters.find(find);
                return rtn;
            };
            const parameter = find();

            if (!parameter) {
                embed.setColor(CONST.COLOR.ERROR);
                embed.setDescription(await message.channel.translate("No such parameter. *shrugs*"));
            } else if (!parameter.check(value)) {
                embed.setColor(CONST.COLOR.ERROR);
                embed.setDescription(await message.channel.translate("New value has a wrong format. Should be {{format}}", {
                    format: parameter.types.map(t => types_human.get(t) || `\`${t}\``).join(", ") + parameter.allowEmpty ? " or `none`" : ""
                }));
            } else {
                embed.setColor(CONST.COLOR.PRIMARY);

                const new_value = parameter.format(value);
                const human_readable = parameter.human(new_value);
                await config.set(message.guild.id, { [parameter.name]: new_value });

                embed.setDescription(`:ok_hand: Set to \`${human_readable}\``);
            }

            await message.channel.send({ embed });
        }));

    cr.registerAlias("config", "cfg");
    cr.registerAlias("config", "opts");

    // prefix alias

    cr.registerCommand("prefix", new OverloadCommand)
        .setHelp(new HelpContent()
            .setDescription("Alias for `{{prefix}}config prefix <?value>`")
            .setUsage("<?prefix>", "view Trixie's prefix in this server")
            .addParameterOptional("prefix", "set the prefix in Trixie's config. \"default\" for default prefix `(!)`"))
        .setCategory(Category.MODERATION)
        .setPermissions(CommandPermission.ADMIN)

        .registerOverload("0", new SimpleCommand(async message => {
            const embed = new Discord.RichEmbed;

            const parameter = config.parameters.find(p => p.name === "prefix");

            embed.setColor(CONST.COLOR.PRIMARY);
            embed.setThumbnail(message.guild.iconURL);
            embed.setTitle(parameter.humanName);

            const value = await config.get(message.guild.id, parameter.name);
            const human_readable = parameter.human(value);
            embed.addField("Currently:", `\`${human_readable}\``);
            embed.addField("Update:", `\`${message.prefix}${parameter.name} <new value>\``);
            embed.addField("Allowed Types:", parameter.types.map(t => {
                return types_human.get(t) || `\`${t}\``;
            }).join(", ") + (parameter.allowEmpty ? " or `none`" : ""));

            await message.channel.send({ embed });
        }))
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            const value = findArgs(content)[0];

            const embed = new Discord.RichEmbed;

            const parameter = config.parameters.find(p => p.name === "prefix");

            if (!parameter.check(value)) {
                embed.setColor(CONST.COLOR.ERROR);
                embed.setDescription(await message.channel.translate("New value has a wrong format. Should be {{format}}", {
                    format: parameter.types.map(t => types_human.get(t) || `\`${t}\``).join(", ") + parameter.allowEmpty ? " or `none`" : ""
                }));
            } else {
                embed.setColor(CONST.COLOR.PRIMARY);

                const new_value = parameter.format(value);
                const human_readable = parameter.human(new_value);
                await config.set(message.guild.id, { [parameter.name]: new_value });

                embed.setDescription(`:ok_hand: Set to \`${human_readable}\``);
            }

            await message.channel.send({ embed });
        }));
};