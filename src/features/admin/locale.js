const CONST = require("../../modules/CONST");
const Discord = require("discord.js");
const Command = require("../../class/Command");

class LocaleCommand extends Command {    
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^locale\b/i.test(message.content)) return;

        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.ADMINISTRATOR);
        if (!permission) return;

        let msg = message.content.substr(7).trim();

        if (msg === "") {
            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            const locale = await message.locale();
            embed.addField("global", locale.global);
            const channels = locale.channels || {};
            for (const channelId in channels) {
                if (message.guild.channels.has(channelId)) {
                    embed.addField("#" + message.guild.channels.get(channelId).name, channels[channelId], true);
                }
            }
            await message.channel.send({ embed });
        } else if (/^(((\w){2})|global|default)\b/i.test(msg)) {
            const channel = message.mentions.channels.first();
            if (!channel) {
                await this.client.locale.set(message.guild.id, msg);
                await message.channel.sendTranslated("Changed locale for the server to {{locale}}", {
                    locale: msg
                });
            } else {
                const locale = msg.split(" ")[0];
                await this.client.locale.set(message.guild.id, channel.id, locale);
                await message.channel.sendTranslated("Changed locale for {{channel}} to {{locale}}", {
                    channel: channel.toString(),
                    locale: await this.client.locale.get(message.guild.id, channel.id)
                });
            }
        } else {
            await message.channel.send(this.usage(message.prefix));
        }
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return `\`${prefix}locale\` view the Trixie's locales in this server
\`${prefix}locale <locale>\` set a global locale
\`${prefix}locale <locale> <channel>\` set a channel to be a unique locale`;
    }
}

module.exports = LocaleCommand;
