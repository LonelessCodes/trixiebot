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

import { MessageTarget } from "discord.js";
import { format } from "../string";
import HelpBuilder from "./HelpBuilder";
import CommandScope from "./CommandScope";
import CommandPermission from "./CommandPermission";
import BaseCommand from "../../core/commands/BaseCommand";
import AliasCommand from "../../core/commands/AliasCommand";

export interface HelpJSON {
    explicit?: boolean;
    description?: string;
    permissions?: string;
    rateLimiter?: string;
    usage?: string;
    category?: string;
}

export interface JSONCommand {
    name: string;
    help: HelpJSON;
}

export function helpToJSON(prefix: string, name: string, command: BaseCommand): HelpJSON {
    const json: HelpJSON = {};
    if (command.explicit) json.explicit = true;
    if (command.help && command.help.description) json.description = command.help.description;
    if (command.permissions && command.permissions !== CommandPermission.USER) json.permissions = command.permissions.toString();
    if (command.rateLimiter) json.rateLimiter = command.rateLimiter.toString();

    const fields = HelpBuilder.generateUsage(prefix, { type: "text", nsfw: false } as MessageTarget, name, command);

    let str = "";
    for (const { title, usage } of fields) {
        if (usage !== "") str += (title ? "**" + title + "**" : "") + "\n" + format(usage, { prefix });
    }

    json.usage = str;

    if (command.category) json.category = command.category.toString();

    return json;
}

export function buildCommandsList(prefix: string, commands: Map<string, BaseCommand>): { prefix: string; commands: JSONCommand[]; } {
    const jason: {
        prefix: string;
        commands: JSONCommand[];
    } = {
        prefix,
        commands: [],
    };

    for (const [name, cmd] of commands) {
        if (cmd instanceof AliasCommand) continue;
        if (!cmd.help) continue;
        if (!cmd.scope.has(CommandScope.FLAGS.GUILD)) continue;
        jason.commands.push({
            name,
            help: helpToJSON(prefix, name, cmd),
        });
    }

    return jason;
}
