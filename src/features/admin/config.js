const { findArgs } = require("../../modules/util");
const Discord = require("discord.js");
const Command = require("../../class/Command");

class ConfigCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^config\b/.test(message.content)) return;
        
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.ADMINISTRATOR);
        if (!permission) return;

        let msg = message.content.substr(7).trim();

        const args = findArgs(msg);

        if (args.length === 0) {
            const embed = new Discord.RichEmbed;
            embed.setTitle(message.guild.name);
            embed.setThumbnail(message.guild.iconURL);

            const config = await this.config.get(message.guild.id);
            for (let parameter in config) {
                embed.addField(parameter, config[parameter], true);
            }

            await message.channel.send({ embed });
            return;
        } else if (args.length === 1) {
            const embed = new Discord.RichEmbed;
            const value = await this.config.get(message.guild.id, args[0]);

            if (!value) embed.setDescription("No such parameter. *shrugs*");
            else embed.addField(args[0], value, true);

            await message.channel.send({ embed });
            return;
        } else if (args.length === 2) {
            if(args[1] === "default") {
                await this.config.set(message.guild.id, { [args[0]]: this.config.default_config[args[0]] });
            } else {
                await this.config.set(message.guild.id, { [args[0]]: args[1] });                
            }
            const embed = new Discord.RichEmbed;

            embed.addField(args[0], await this.config.get(message.guild.id, args[0]), true);

            await message.channel.send({ embed });
            return;
        }
    }

    usage(prefix) {
        return `\`${prefix}config\` view the Trixie's config in this server
\`${prefix}config <parameter>\` view only this parameter's config
\`${prefix}config <parameter> <value>\` set a parameter in Trixie's config. "default" for default config`;
    }
}

module.exports = ConfigCommand;
