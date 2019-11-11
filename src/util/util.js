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

const config = require("../config");
const CONST = require("../const");
const Discord = require("discord.js");
const TranslationEmbed = require("../modules/i18n/TranslationEmbed");
const TranslationMerge = require("../modules/i18n/TranslationMerge");

if (!config.has("owner_id")) throw new Error("No owner_id specified in the config");
const ownerId = config.get("owner_id");

module.exports = new class Utils {
    isPlainObject(input) {
        return input && !Array.isArray(input) && typeof input === "object";
    }

    findDefaultChannel(guild) {
        return guild.channels.find(c => new RegExp("general", "g").test(c.name) && c.type === "text") ||
            guild.channels
                .filter(c => c.type === "text" && c.send && typeof c.send === "function")
                .sort((a, b) => a.position - b.position)
                .find(c => c.permissionsFor(guild.me).has("SEND_MESSAGES"));
    }

    isOwner(member) {
        if (member instanceof Discord.GuildMember) member = member.user;
        return member.id === ownerId;
    }

    userToString(member, plainText = false) {
        if (member instanceof Discord.GuildMember) member = member.user;
        return plainText ?
            `${member.username}#${member.discriminator}` :
            `**${member.username}** #${member.discriminator}`;
    }

    basicEmbed(title, user, color = CONST.COLOR.PRIMARY) {
        if (user instanceof Discord.Guild) return new Discord.RichEmbed()
            .setColor(color)
            .setAuthor(`${user.name} | ${title}`, user.iconURL);
        if (user instanceof Discord.GuildMember) user = user.user;
        return new Discord.RichEmbed()
            .setColor(color)
            .setAuthor(`${module.exports.userToString(user, true)} | ${title}`, user.avatarURL);
    }

    basicTEmbed(title, user, color = CONST.COLOR.PRIMARY) {
        if (user instanceof Discord.Guild) return new TranslationEmbed()
            .setColor(color)
            .setAuthor(new TranslationMerge(user.name, "|", title), user.iconURL);
        if (user instanceof Discord.GuildMember) user = user.user;
        return new TranslationEmbed()
            .setColor(color)
            .setAuthor(new TranslationMerge(module.exports.userToString(user, true), "|", title), user.avatarURL);
    }

    progressBar(v, length, a, b) {
        if (Number.isNaN(v)) v = 0;
        if (!Number.isFinite(v)) v = 0;

        const str = new Array(length);
        str.fill(a);
        str.fill(b, Math.round(v * length));
        return `${str.join("")} ${(v * 100).toFixed(1)}%`;
    }

    /**
     * @param {Discord.Guild} guild
     * @param {Discord.UserResolvable} user
     * @param {boolean} cache
     * @returns {Promise<Discord.GuildMember>}
     */
    async fetchMember(guild, user, cache = true) {
        return await guild.fetchMember(user, cache).catch(() => null);
    }

    debounce(func, wait, immediate) {
        let timeout, args, context, timestamp, result;

        const later = () => {
            const last = +new Date() - timestamp;

            if (last < wait && last > 0) {
                timeout = setTimeout(later, wait - last);
            } else {
                timeout = null;
                if (!immediate) {
                    result = func.apply(context, args);
                    if (!timeout) context = args = null;
                }
            }
        };

        return function debouncer(...args) {
            // eslint-disable-next-line consistent-this
            context = this;
            timestamp = +new Date();
            const callNow = immediate && !timeout;
            if (!timeout) timeout = setTimeout(later, wait);
            if (callNow) {
                result = func.apply(context, args);
                context = args = null;
            }

            return result;
        };
    }
};
