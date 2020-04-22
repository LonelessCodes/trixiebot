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

import config from "../config";
import CONST from "../const";
import Discord from "discord.js";
import TranslationEmbed from "../modules/i18n/TranslationEmbed";
import TranslationMerge from "../modules/i18n/TranslationMerge";
import { Resolvable } from "../modules/i18n/Resolvable";

if (!config.has("owner_id")) throw new Error("No owner_id specified in the config");
const owner_id = config.get("owner_id") as string;

export type TextBasedChannel = Discord.TextBasedChannelFields;

export type UserResolvable = Discord.Message | Discord.GuildMember | Discord.User;
export type UserIdResolvable = Discord.UserResolvable;

export function isPlainObject(input: any) {
    return input && !Array.isArray(input) && typeof input === "object";
}

export function findDefaultChannel(guild: Discord.Guild) {
    return (
        guild.channels.cache.find(c => new RegExp("general", "g").test(c.name) && c.type === "text") ||
        guild.channels.cache
            .filter(c => c instanceof Discord.TextChannel)
            .sort((a, b) => a.rawPosition - b.rawPosition)
            .find(c => !!guild.me && !!c.permissionsFor(guild.me)?.has("SEND_MESSAGES"))
    );
}

export function resolveUser(user: UserResolvable): Discord.User {
    if (user instanceof Discord.Message) user = user.author;
    if (user instanceof Discord.GuildMember) user = user.user;
    return user;
}
export function resolveUserId(id: UserIdResolvable): Discord.Snowflake {
    if (typeof id === "string") return id;
    return resolveUser(id).id;
}

export function isOwner(id: UserIdResolvable) {
    return resolveUserId(id) === owner_id;
}

export function userToString(user: UserResolvable, plain_text = false) {
    user = resolveUser(user);
    return plain_text ? `${user.username}#${user.discriminator}` : `**${user.username}** #${user.discriminator}`;
}

export function basicEmbed(title: string, user: UserResolvable, color: number): Discord.MessageEmbed;
export function basicEmbed(title: string, user: Discord.Guild, color: number): Discord.MessageEmbed;
export function basicEmbed(title: string, user: UserResolvable | Discord.Guild, color = CONST.COLOR.PRIMARY) {
    if (user instanceof Discord.Guild)
        return new Discord.MessageEmbed()
            .setColor(color)
            .setAuthor(`${user.name} | ${title}`, user.iconURL({ size: 32, dynamic: true }) || undefined);

    user = resolveUser(user);
    return new Discord.MessageEmbed()
        .setColor(color)
        .setAuthor(`${userToString(user, true)} | ${title}`, user.avatarURL({ size: 32, dynamic: true }) || undefined);
}

export function basicTEmbed(title: Resolvable<string>, user: UserResolvable, color: number): TranslationEmbed;
export function basicTEmbed(title: Resolvable<string>, user: Discord.Guild, color: number): TranslationEmbed;
export function basicTEmbed(
    title: Resolvable<string>,
    user: UserResolvable | Discord.Guild,
    color = CONST.COLOR.PRIMARY
): TranslationEmbed {
    if (user instanceof Discord.Guild)
        return new TranslationEmbed()
            .setColor(color)
            .setAuthor(new TranslationMerge(user.name, "|", title), user.iconURL({ size: 32, dynamic: true }) || undefined);

    user = resolveUser(user);
    return new TranslationEmbed()
        .setColor(color)
        .setAuthor(
            new TranslationMerge(userToString(user, true), "|", title),
            user.avatarURL({ size: 32, dynamic: true }) || undefined
        );
}

export function progressBar(v: number, length: number, a: string, b: string) {
    if (Number.isNaN(v)) v = 0;
    if (!Number.isFinite(v)) v = 0;

    const str = new Array(length);
    str.fill(a);
    str.fill(b, Math.round(v * length));
    return `${str.join("")} ${(v * 100).toFixed(1)}%`;
}

export async function fetchMember(
    guild: Discord.Guild,
    user: Discord.UserResolvable,
    cache: boolean = true
): Promise<Discord.GuildMember | null> {
    try {
        return await guild.members.fetch({ user, cache });
    } catch (e) {
        return null;
    }
}

export function debounce<A extends [], B, C>(func: (this: C, ...args: A) => B, wait: number): (this: C, ...args: A) => B | void {
    let timeout: NodeJS.Timeout | undefined, timestamp: number, result: B | void;

    const later = (context: C, args: A) => {
        const last = +new Date() - timestamp;

        if (last < wait && last > 0) {
            timeout = global.setTimeout(() => later(context, args), wait - last);
        } else {
            timeout = undefined;
            result = func.apply(context, args);
        }
    };

    return function debouncer(...args: A) {
        timestamp = +new Date();
        if (!timeout) timeout = global.setTimeout(() => later(this, args), wait);

        return result;
    };
}
