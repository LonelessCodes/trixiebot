const { findArgs } = require("../../modules/util");
const CONST = require("../../modules/const");
const Discord = require("discord.js");
const Command = require("../../class/Command");

const types_human = new Map([
    [String, "Text"],
    [Number, "Number"],
    [Boolean, "true or false"],
    [Discord.TextChannel, "\\#Channel"],
    [Discord.Role, "Role Name"],
    [Discord.GuildMember, "\\@User"]
]);

class ConfigCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^config\b/i.test(message.content)) return;

        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.ADMINISTRATOR) ||
            message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_GUILD);
        if (!permission) return;

        let msg = message.content.substr(7).trim();

        const args = findArgs(msg);

        if (args.length === 0) {
            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setTitle(message.guild.name);
            embed.setThumbnail(message.guild.iconURL);

            embed.setDescription("Use the command format !config <option> to view more info about an option.");

            const parameters = this.config.parameters;

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
                this.config.parameters.find(find);
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

                const value = await this.config.get(message.guild.id, args[0]);
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
                this.config.parameters.find(find);
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
                await this.config.set(message.guild.id, { [parameter.name]: new_value });

                embed.setDescription(`:ok_hand: Set to \`${human_readable}\``);
            }

            await message.channel.send({ embed });
            return;
        }
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return `\`${prefix}config\` view the Trixie's config in this server
\`${prefix}config <parameter>\` view only this parameter's config
\`${prefix}config <parameter> <value>\` set a parameter in Trixie's config. "default" for default config`;
    }
}

module.exports = ConfigCommand;
