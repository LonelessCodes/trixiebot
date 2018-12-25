const { findArgs } = require("../../modules/string_utils");
const CONST = require("../../modules/CONST");
const Discord = require("discord.js");

const BaseCommand = require("../../class/BaseCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const CommandPermission = require("../../logic/commands/CommandPermission");
const Category = require("../../logic/commands/Category");

const types_human = new Map([
    [String, "Text"],
    [Number, "Number"],
    [Boolean, "true or false"],
    [Discord.TextChannel, "\\#Channel"],
    [Discord.Role, "Role Name"],
    [Discord.GuildMember, "\\@User"]
]);

module.exports = async function install(cr, client, config) {
    cr.register("config", new class extends BaseCommand {
        async call(message, content) {
            const args = findArgs(content);

            if (args.length === 0) {
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
                return;
            } else if (args.length === 1) {
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
                } else {
                    embed.setColor(CONST.COLOR.PRIMARY);
                    embed.setThumbnail(message.guild.iconURL);
                    embed.setTitle(parameter.humanName);

                    const value = await config.get(message.guild.id, args[0]);
                    const human_readable = parameter.human(value);
                    embed.addField("Currently:", `\`${human_readable}\``);
                    embed.addField("Update:", `\`${message.prefix}config ${parameter.name} <new value>\``);
                    embed.addField("Allowed Types:", parameter.types.map(t => {
                        return types_human.get(t) || `\`${t}\``;
                    }).join(", ") + (parameter.allowEmpty ? " or `none`" : ""));
                }

                await message.channel.send({ embed });
                return;
            } else if (args.length === 2) {
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
                } else if (!parameter.check(args[1])) {
                    embed.setColor(CONST.COLOR.ERROR);
                    embed.setDescription(await message.channel.translate("New value has a wrong format. Should be {{format}}", {
                        format: parameter.types.map(t => types_human.get(t) || `\`${t}\``).join(", ") + parameter.allowEmpty ? " or `none`" : ""
                    }));
                } else {
                    embed.setColor(CONST.COLOR.PRIMARY);

                    const new_value = parameter.format(args[1]);
                    const human_readable = parameter.human(new_value);
                    await config.set(message.guild.id, { [parameter.name]: new_value });

                    embed.setDescription(`:ok_hand: Set to \`${human_readable}\``);
                }

                await message.channel.send({ embed });
                return;
            }
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<?parameter> <?value>", "view the Trixie's config in this server")
            .addParameterOptional("parameter", "view only this parameter's config")
            .addParameterOptional("value", "set a parameter in Trixie's config. \"default\" for default config"))
        .setCategory(Category.MODERATION)
        .setPermissions(CommandPermission.ADMIN);
    
    cr.registerAlias("config", "cfg");
    cr.registerAlias("config", "opts");

    // prefix alias

    cr.register("prefix", new class extends BaseCommand {
        async call(message, content) {
            const args = findArgs(content);

            const embed = new Discord.RichEmbed;

            const parameter = config.parameters.find(p => p.name === "prefix");

            if (args.length === 1) {
                embed.setColor(CONST.COLOR.PRIMARY);
                embed.setThumbnail(message.guild.iconURL);
                embed.setTitle(parameter.humanName);

                const value = await config.get(message.guild.id, args[0]);
                const human_readable = parameter.human(value);
                embed.addField("Currently:", `\`${human_readable}\``);
                embed.addField("Update:", `\`${message.prefix}config ${parameter.name} <new value>\``);
                embed.addField("Allowed Types:", parameter.types.map(t => {
                    return types_human.get(t) || `\`${t}\``;
                }).join(", ") + (parameter.allowEmpty ? " or `none`" : ""));
            } else if (args.length === 2) {
                if (!parameter.check(args[1])) {
                    embed.setColor(CONST.COLOR.ERROR);
                    embed.setDescription(await message.channel.translate("New value has a wrong format. Should be {{format}}", {
                        format: parameter.types.map(t => types_human.get(t) || `\`${t}\``).join(", ") + parameter.allowEmpty ? " or `none`" : ""
                    }));
                } else {
                    embed.setColor(CONST.COLOR.PRIMARY);

                    const new_value = parameter.format(args[1]);
                    const human_readable = parameter.human(new_value);
                    await config.set(message.guild.id, { [parameter.name]: new_value });

                    embed.setDescription(`:ok_hand: Set to \`${human_readable}\``);
                }
            }

            await message.channel.send({ embed });
            return;
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Alias for `{{prefix}}config prefix <?value>`")
            .setUsage("<?prefix>", "vue Trixie's prefix in this server")
            .addParameterOptional("prefix", "set the prefix in Trixie's config. \"default\" for default prefix `(!)`"))
        .setCategory(Category.MODERATION)
        .setPermissions(CommandPermission.ADMIN);

};