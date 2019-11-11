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

const { splitArgs, findArgs } = require("../../util/string");
const CONST = require("../../const");
const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const Category = require("../../util/commands/Category");

const Translation = require("../../modules/i18n/Translation");
const TranslationEmbed = require("../../modules/i18n/TranslationEmbed");
const TranslationMerge = require("../../modules/i18n/TranslationMerge");
const ListFormat = require("../../modules/i18n/ListFormat");

const types_human = new Map([
    [String, new Translation("config.type.text", "Text")],
    [Number, new Translation("config.type.num", "Number")],
    [Boolean, new Translation("config.type.bool", "true or false")],
    [Discord.TextChannel, new Translation("config.type.ch", "\\#Channel")],
    [Discord.Role, new Translation("config.type.role", "Role Name")],
    [Discord.GuildMember, new Translation("config.type.user", "\\@User")],
]);

module.exports = function install(cr, { config }) {
    cr.registerCommand("config", new OverloadCommand)
        .setHelp(new HelpContent()
            .setUsage("<?parameter> <?value>", "view the Trixie's config in this server")
            .addParameterOptional("parameter", "view only this parameter's config")
            .addParameterOptional("value", "set a parameter in Trixie's config. \"default\" for default config"))
        .setCategory(Category.MODERATION)
        .setPermissions(CommandPermission.ADMIN)

        .registerOverload("0", new SimpleCommand(({ message, prefix }) => {
            const embed = new TranslationEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setTitle(message.guild.name);
            embed.setThumbnail(message.guild.iconURL);
            embed.setDescription(new Translation(
                "config.description", "Use the command format !config <option> to view more info about an option."
            ));

            const parameters = config.parameters;

            for (let i = 0; i < parameters.length; i++) {
                let parameter = parameters[i];

                if (Array.isArray(parameter.name)) {
                    const str = new TranslationMerge().separator("\n");
                    for (let j = 0; j < parameter.name.length; j++) {
                        let sub = parameter.name[j];
                        sub.position = j;

                        str.push(new TranslationMerge(`\`${prefix}config ${sub.name}\` -`, sub.humanName));
                    }
                    embed.addField(parameter.humanName, str, true);
                } else {
                    embed.addField(parameter.humanName, `\`${prefix}config ${parameter.name}\``, true);
                }
            }

            return embed;
        }))
        .registerOverload("1", new SimpleCommand(({ message, prefix, content: arg }) => {
            const find = () => {
                let rtn;
                const find = p => {
                    if (p.name instanceof Array) return p.name.find(find);
                    if (p.name === arg) rtn = p;
                };
                config.parameters.find(find);
                return rtn;
            };

            return getParameter(message, prefix, find());
        }))
        .registerOverload("2+", new SimpleCommand(({ message, content }) => {
            const args = splitArgs(content, 2);
            const value = findArgs(args[1])[0];

            const find = () => {
                let rtn;
                const find = p => {
                    if (p.name instanceof Array) return p.name.find(find);
                    if (p.name === args[0]) rtn = p;
                };
                config.parameters.find(find);
                return rtn;
            };

            return setParameter(message, find(), value);
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

        .registerOverload("0", new SimpleCommand(({ message, prefix }) =>
            getParameter(message, prefix, config.parameters.find(p => p.name === "prefix"))
        ))
        .registerOverload("1+", new SimpleCommand(({ message, content }) =>
            setParameter(message, config.parameters.find(p => p.name === "prefix"), content)
        ));

    async function getParameter(message, prefix, parameter) {
        const embed = new TranslationEmbed;

        if (!parameter) {
            embed.setColor(CONST.COLOR.ERROR);
            embed.setDescription(new Translation("config.no_parameter", "No such parameter. *shrugs*"));
        } else {
            embed.setColor(CONST.COLOR.PRIMARY);
            embed.setThumbnail(message.guild.iconURL);
            embed.setTitle(parameter.humanName);

            const value = await config.get(message.guild.id, parameter.name);
            const human_readable = parameter.human(value);
            embed.addField(new Translation("config.currently", "Currently:"), `\`${human_readable}\``);
            embed.addField(new Translation("config.update", "Update:"), `\`${prefix}config ${parameter.name} <new value>\``);
            embed.addField(new Translation("config.allowed_types", "Allowed Types:"), new ListFormat(
                parameter.types
                    .concat(parameter.allowEmpty ? ["none"] : [])
                    .map(t => types_human.get(t) || new TranslationMerge("`", t, "`").separator("")),
                { type: "or" }
            ));
        }

        return embed;
    }

    async function setParameter(message, parameter, value) {
        const embed = new TranslationEmbed;

        if (!parameter) {
            embed.setColor(CONST.COLOR.ERROR);
            embed.setDescription(new Translation("config.no_parameter", "No such parameter. *shrugs*"));
        } else if (!parameter.check(value)) {
            embed.setColor(CONST.COLOR.ERROR);
            embed.setDescription(new Translation("config.wrong_format", "New value has a wrong format. Should be {{format}}", {
                format: new ListFormat(
                    parameter.types
                        .concat(parameter.allowEmpty ? ["none"] : [])
                        .map(t => types_human.get(t) || new TranslationMerge("`", t, "`").separator("")),
                    { type: "or" }
                ),
            }));
        } else {
            embed.setColor(CONST.COLOR.PRIMARY);

            const new_value = parameter.format(value);
            const human_readable = parameter.human(new_value);
            await config.set(message.guild.id, { [parameter.name]: new_value });

            embed.setDescription(new Translation("config.success", ":ok_hand: Set to `{{value}}`", {
                value: human_readable,
            }));
        }

        return embed;
    }
};
