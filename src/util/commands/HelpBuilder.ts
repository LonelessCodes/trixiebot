/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

import BaseCommand from "../../core/commands/BaseCommand";
import TreeCommand from "../../core/commands/TreeCommand";
import ScopedCommand from "../../core/commands/ScopedCommand";
import AliasCommand from "../../core/commands/AliasCommand";
import { Parameter } from "../../core/managers/ConfigManager";
import CommandPermission from "./CommandPermission";
import Category from "./Category";
import Discord from "discord.js";
import { ucFirst, format } from "../string";
import CONST from "../../const";
import MessageContext from "./MessageContext";

const CHANNEL_TYPE_ERR = "Can only send a message in a TextChannel or DMChannel";

export default class HelpBuilder extends Discord.MessageEmbed {
    constructor(ctx: MessageContext, name: string, command: BaseCommand) {
        super();

        if (!(ctx.channel instanceof Discord.TextChannel || ctx.channel instanceof Discord.DMChannel))
            throw new Error(CHANNEL_TYPE_ERR);

        this.setColor(CONST.COLOR.PRIMARY);
        this.setAuthor(`${ucFirst(name)} command`, ctx.client.user?.avatarURL({ size: 32, dynamic: true }) || undefined);

        if (command.help && command.help.description) this.setDescription(command.help.description);
        if (command.permissions && command.permissions !== CommandPermission.USER)
            this.addField("Permissions required:", command.permissions.toString());
        if (command.rateLimiter) this.addField("Rate Limiting:", command.rateLimiter.toString());

        const fields = HelpBuilder.generateUsage(ctx.prefix, ctx.channel, name, command);

        for (const { title, usage } of fields)
            if (usage !== "") this.addField(title || "Usage:", format(usage, { prefix: ctx.prefix }));

        if (command.category) this.setFooter(`Category: ${command.category.toString()}`);
    }

    static createParameter(name: string, parameter: Parameter) {
        return `\`${name}\` ${parameter.optional ? "- optional " : ""}- ${parameter.content}`;
    }

    static generateUsage(
        prefix: string,
        channel: Discord.MessageTarget,
        name: string,
        command: BaseCommand
    ): { usage: string; title: string }[] {
        const fields = [{ usage: "", title: "" }];
        let i = 0;

        const nsfw = channel instanceof Discord.TextChannel && channel.nsfw;

        const func = (name: string, command: BaseCommand, parent_name?: string) => {
            if (command instanceof ScopedCommand) {
                const scope_cmd = command.getCmd(channel);
                if (!scope_cmd) return;
                command = scope_cmd;
            }

            const help = command.help;
            let field = fields[i];

            if (help) {
                if (help.title) {
                    fields.push({
                        usage: "",
                        title: help.title.charAt(help.title.length - 1) === ":" ? help.title : `${help.title}:`,
                    });
                    i++;
                    field = fields[i];
                }

                for (const { options, usage } of help.usage) {
                    if (options === "" && usage) field.usage += `\`${prefix}${name}\` - ${usage}`;
                    else if (options && usage) field.usage += `\`${prefix}${name}${` ${options}`}\` - ${usage}`;
                    else if (options === "" && !usage) field.usage += `\`${prefix}${name}\``;
                    else if (options && !usage) field.usage += `\`${prefix}${name}${` ${options}`}\``;
                    else if (!options && usage) field.usage += help.usage;
                    else if (!options && !usage) field.usage += `\`${prefix}${name}\``;

                    field.usage += "\n";
                }

                let aliases = [
                    ...command.aliases
                        .map(v => {
                            if (v !== "*") return parent_name ? `${parent_name} ${v}` : v;
                            return parent_name;
                        })
                        .filter(a => !!a),
                ];

                if (command instanceof TreeCommand && command.sub_commands.has("*")) {
                    aliases = [...aliases, ...command.sub_commands.get("*").aliases.map((v: string) => `${name} ${v}`)];
                }

                if (aliases.length > 0) field.usage += ` *(alias ${aliases.map(a => `\`${prefix}${a}\``).join(", ")})*\n`;

                if (help.parameters.size > 0) {
                    for (const [name, parameter] of help.parameters) {
                        field.usage += `${this.createParameter(name, parameter)}\n`;
                    }
                }
            }

            if (command instanceof TreeCommand) {
                for (const [sub_cmd_name, sub_command] of command.sub_commands) {
                    if (sub_command instanceof AliasCommand) continue;
                    if (!sub_command.hasScope(channel)) continue;
                    if (!sub_command.isInSeason()) continue;
                    if (sub_cmd_name === "*") continue;
                    if (!nsfw && sub_command.explicit) continue;
                    if (!sub_command.listed) continue;
                    if (sub_command.category === Category.OWNER) continue;

                    const sub_name = `${name} ${sub_cmd_name}`;

                    field.usage += "\n\n";

                    func(sub_name, sub_command, name);
                }
            }
        };
        func(name, command);

        return fields.map(f => ({ usage: f.usage.replace(/\n{2,}/g, "\n\n"), title: f.title }));
    }

    static async sendHelp(message: MessageContext, name: string, command: BaseCommand) {
        if (command instanceof AliasCommand) {
            command = command.command;
        }

        if (!command.help) return;

        const embed = new HelpBuilder(message, name, command);
        return await message.channel.send({ embed });
    }
}
