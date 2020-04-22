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

const TreeCommand = require("../../core/commands/TreeCommand");
const ScopeCommand = require("../../core/commands/ScopedCommand");
const AliasCommand = require("../../core/commands/AliasCommand");
const CommandPermission = require("./CommandPermission");
const Category = require("./Category");
const { MessageEmbed } = require("discord.js");
const { ucFirst, format } = require("../string");
const CONST = require("../../const").default;

class HelpBuilder extends MessageEmbed {
    constructor(message, name, command) {
        super();

        const prefix = message.channel.type === "text" ? message.prefix : "";

        this.setColor(CONST.COLOR.PRIMARY);
        this.setAuthor(`${ucFirst(name)} command`, message.client.user.avatarURL({ size: 32, dynamic: true }));

        if (command.help.description) this.setDescription(command.help.description);
        if (command.permissions && command.permissions !== CommandPermission.USER)
            this.addField("Permissions required:", command.permissions.toString());
        if (command.rateLimiter)
            this.addField("Rate Limiting:", command.rateLimiter.toString());

        const fields = HelpBuilder.generateUsage(prefix, message.channel, name, command);

        for (let { title, usage } of fields) {
            if (usage !== "") this.addField(title || "Usage:", format(usage, { prefix }));
        }

        if (command.category) this.setFooter(`Category: ${command.category.toString()}`);
    }

    static createParameter(name, parameter) {
        return `\`${name}\` ${parameter.optional ? "- optional " : ""}- ${parameter.content}`;
    }

    /**
     * @param {string} prefix
     * @param {{ type: string, nsfw: boolean }} channel
     * @param {string} name
     * @param {BaseCommand} command
     * @returns {{ usage: string, title: string }[]}
     */
    static generateUsage(prefix, channel, name, command) {
        let fields = [{ usage: "", title: "" }];
        let i = 0;

        const func = (name, command, parentName) => {
            if (command instanceof ScopeCommand) {
                command = command.getCmd(channel);
                if (!command) return;
            }

            const help = command.help;
            let field = fields[i];

            if (help) {
                if (help.title) {
                    fields.push({
                        usage: "",
                        title: help.title.charAt(help.title.length - 1) === ":" ? help.title : help.title + ":",
                    });
                    i++;
                    field = fields[i];
                }

                for (let { options, usage } of help.usage) {
                    if (options === "" && usage)
                        field.usage += `\`${prefix}${name}\` - ${usage}`;
                    else if (options && usage)
                        field.usage += `\`${prefix}${name}${" " + options}\` - ${usage}`;
                    else if (options === "" && !usage)
                        field.usage += `\`${prefix}${name}\``;
                    else if (options && !usage)
                        field.usage += `\`${prefix}${name}${" " + options}\``;
                    else if (!options && usage)
                        field.usage += help.usage;
                    else if (!options && !usage)
                        field.usage += `\`${prefix}${name}\``;

                    field.usage += "\n";
                }

                let aliases = [...command.aliases.map(v => {
                    if (v !== "*") return parentName ? parentName + " " + v : v;
                    else return parentName;
                }).filter(a => !!a)];

                if (command instanceof TreeCommand && command.sub_commands.has("*")) {
                    aliases = [...aliases, ...command.sub_commands.get("*").aliases.map(v => name + " " + v)];
                }

                if (aliases.length > 0)
                    field.usage += ` *(alias ${aliases.map(a => `\`${prefix}${a}\``).join(", ")})*\n`;

                if (help.parameters.size > 0) {
                    for (const [name, parameter] of help.parameters) {
                        field.usage += this.createParameter(name, parameter) + "\n";
                    }
                }
            }

            if (command instanceof TreeCommand) {
                for (const [sub_cmd_name, sub_command] of command.sub_commands) {
                    if (sub_command instanceof AliasCommand) continue;
                    if (!sub_command.hasScope(channel)) continue;
                    if (!sub_command.isInSeason()) continue;
                    if (sub_cmd_name === "*") continue;
                    if (!channel.nsfw && sub_command.explicit) continue;
                    if (!sub_command.list) continue;
                    if (sub_command.category === Category.OWNER) continue;

                    const sub_name = name + " " + sub_cmd_name;

                    field.usage += "\n\n";

                    func(sub_name, sub_command, name);
                }
            }
        };
        func(name, command);

        return fields.map(f => ({ usage: f.usage.replace(/\n{2,}/g, "\n\n"), title: f.title }));
    }

    static async sendHelp(message, name, command) {
        if (command instanceof AliasCommand) {
            command = command.command;
        }

        if (!command.help) return;

        const embed = new HelpBuilder(message, name, command);
        return await message.channel.send({ embed });
    }
}

module.exports = HelpBuilder;
