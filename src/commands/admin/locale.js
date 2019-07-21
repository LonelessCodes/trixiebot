const CONST = require("../../const");
const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const Category = require("../../util/commands/Category");

module.exports = async function install(cr, client) {
    cr.registerCommand("locale", new OverloadCommand)
        .setHelp(new HelpContent()
            .setDescription("Trixie supports multiple different languages, including " + client.locale.locales.map(v => `\`${v}\``).join(", ") + ". Here you can set them in your server")
            .setUsage("<?locale> <?channel>", "view the Trixie's locales in this server")
            .addParameterOptional("locale", "set a global locale. If `channel` is given, sets as channel-only locale")
            .addParameterOptional("channel", "set a channel to be a unique locale"))
        .setCategory(Category.MODERATION)
        .setPermissions(CommandPermission.ADMIN)

        .registerOverload("0", new SimpleCommand(async message => {
            const locale = await message.locale();

            const embed = new Discord.RichEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .addField("global", locale.global);
            
            const channels = locale.channels || {};
            for (const channelId in channels) {
                if (message.guild.channels.has(channelId)) {
                    embed.addField("#" + message.guild.channels.get(channelId).name, channels[channelId], true);
                }
            }
            await message.channel.send({ embed });
        }))
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            if (!/^(global|default)$/i.test(content) && !client.locale.locales.includes(content.toLowerCase())) {
                await message.channel.sendTranslated("Locale '{{locale}}' is not supported :c Try {{locales}}", {
                    locale: content,
                    locales: client.locale.locales.map(v => `\`${v}\``).join(", ")
                });
                return;
            }

            const channel = message.mentions.channels.first();
            if (!channel) {
                await client.locale.set(message.guild.id, content.toLowerCase());
                await message.channel.sendTranslated("Changed locale for the server to {{locale}}", {
                    locale: await client.locale.get(message.guild.id)
                });
            } else {
                const locale = content.split(" ")[0];
                await client.locale.set(message.guild.id, channel.id, locale.toLowerCase());
                await message.channel.sendTranslated("Changed locale for {{channel}} to {{locale}}", {
                    channel: channel.toString(),
                    locale: await client.locale.get(message.guild.id, channel.id)
                });
            }
        }));
};