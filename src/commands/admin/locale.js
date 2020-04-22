/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const CONST = require("../../const");
const { basicTEmbed } = require("../../modules/i18n/TranslationEmbed");
const { splitArgs } = require("../../util/string");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const Category = require("../../util/commands/Category");

const LocaleManager = require("../../core/managers/LocaleManager");

const Translation = require("../../modules/i18n/Translation");
const TranslationEmbed = require("../../modules/i18n/TranslationEmbed");
const ListFormat = require("../../modules/i18n/ListFormat");

module.exports = function install(cr, { locale: locale_manager }) {
    cr.registerCommand("locale", new OverloadCommand)
        .setHelp(new HelpContent()
            .setDescription("Trixie supports multiple different languages, including " + LocaleManager.getLocales().map(v => `\`${v.name_en}\``).join(", ") + ". Here you can set them in your server")
            .setUsage("<?locale> <?channel>", "view the Trixie's locales in this server")
            .addParameterOptional("locale", "set a global locale. If `channel` is given, sets as channel-only locale")
            .addParameterOptional("channel", "set a channel to be a unique locale"))
        .setCategory(Category.CONFIG)
        .setPermissions(CommandPermission.ADMIN)

        .registerOverload("0", new SimpleCommand(async message => {
            const locale = await locale_manager.get(message.guild.id);
            const name = LocaleManager.getLocaleInfo(locale.global);

            const embed = basicTEmbed(new Translation("locale.title", "Server Locales"), message.guild)
                .addField(new Translation("locale.server", "Server:"), name.name_en);

            const channels = locale.channels || {};
            for (const channelId in channels) {
                if (message.guild.channels.cache.has(channelId)) {
                    const name = LocaleManager.getLocaleInfo(channels[channelId]);
                    embed.addField("#" + message.guild.channels.cache.get(channelId).name, name.name_en, true);
                }
            }
            return embed;
        }))
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            content = splitArgs(content, 2)[0];
            const fit = LocaleManager.findFit(content);

            const locales = LocaleManager.getLocales();
            if (!/^(global|default)$/i.test(content) && !fit) {
                const embed = new TranslationEmbed()
                    .setColor(CONST.COLOR.ERROR)
                    .setDescription(new Translation("locale.not_supported", "Locale '{{locale}}' is not supported :c Try {{locales}}", {
                        locale: content,
                        locales: new ListFormat(locales.map(v => `\`${v.name_en}\``), { type: "or" }),
                    }));
                return embed;
            }

            const embed = new TranslationEmbed().setColor(CONST.COLOR.PRIMARY);

            const channel = message.mentions.channels.first();
            if (!channel) {
                await locale_manager.set(message.guild.id, fit || "default");
                const new_val = await locale_manager.get(message.guild.id);
                embed.setDescription(new Translation("locale.success", "Changed locale for the server to {{locale}}", {
                    locale: LocaleManager.getLocaleInfo(new_val.global).name,
                }));
                return embed;
            } else {
                await locale_manager.set(message.guild.id, channel.id, fit || "default");
                const new_val = await locale_manager.get(message.guild.id, channel.id);
                embed.setDescription(new Translation("locale.success_ch", "Changed locale for {{channel}} to {{locale}}", {
                    channel: channel.toString(),
                    locale: LocaleManager.getLocaleInfo(new_val).name_en,
                }));
                return embed;
            }
        }));
};
