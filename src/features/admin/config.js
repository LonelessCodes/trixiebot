const { findArgs } = require("../../modules/util");
const CONST = require("../../modules/const");
const Discord = require("discord.js");
const Command = require("../../class/Command");

class ConfigCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^config\b/i.test(message.content)) return;

        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.ADMINISTRATOR);
        if (!permission) return;

        let msg = message.content.substr(7).trim();

        const args = findArgs(msg);

        if (args.length === 0) {
            const embed = new Discord.RichEmbed().setColor(CONST.COLOUR);
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
            const embed = new Discord.RichEmbed().setColor(CONST.COLOUR);
            embed.setThumbnail(message.guild.iconURL);

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

            if (!parameter) embed.setDescription(await message.channel.translate("No such parameter. *shrugs*"));
            else {
                embed.setTitle(parameter.humanName);

                console.log(parameter);

                const value = await this.config.get(message.guild.id, args[0]);
                embed.addField("Currently:", `\`${value}\``);
                embed.addField("Update:", `\`${message.prefix}config ${parameter.name} <new value>\``);
            }

            await message.channel.send({ embed });
            return;
        } else if (args.length === 2) {
            const embed = new Discord.RichEmbed().setColor(CONST.COLOUR);

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

            if (!parameter) embed.setDescription(await message.channel.translate("No such parameter. *shrugs*"));
            else if (!parameter.check(args[1])) embed.setDescription(await message.channel.translate("New value has a wrong format"));
            else {
                const new_value = parameter.format(args[1]);
                await this.config.set(message.guild.id, { [parameter.name]: new_value });

                embed.setDescription(`:ok_hand: Set to \`${new_value}\``);
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
