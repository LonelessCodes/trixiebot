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

import Discord from "discord.js";
import { findAndRemove } from "../array";

/**
 * New Custom message mention finder.
 * Keeps track of mentions in a Message.
 */
export default class MessageMentions extends Discord.MessageMentions {
    constructor(content: string, message: Discord.Message) {
        // Pass results from original MessageMentions through
        super(message, message.mentions.users, message.mentions.roles, message.mentions.everyone);

        Object.defineProperty(this, "_content", { value: content });

        // delete to re-arrange
        const _users = this.users.array();
        this.users.clear();

        const matches = content.match(Discord.MessageMentions.USERS_PATTERN) || [];
        for (const id of matches) {
            const user = this.client.users.cache.get(id.replace(/<@!?/, "").replace(">", ""));
            if (user) {
                if (_users.includes(user)) findAndRemove(_users, user);
                this.users.set(user.id, user);
            }
        }

        // Add the leftover users at the end of the collection
        for (const user of _users) if (!this.users.has(user.id)) this.users.set(user.id, user);

        for (let str of content.split(Discord.MessageMentions.USERS_PATTERN)) {
            str = str.trim();
            if (str === "") continue;

            const matches = str.match(MessageMentions.USER_TAG_PATTERN) || [];
            for (let match of matches) {
                match = match.trim();
                if (match === "") continue;
                const user = this.client.users.cache.find(user => user.tag === match);
                if (user) this.users.set(user.id, user);
            }

            if (!this.guild) continue;

            for (let display_name of str.split(MessageMentions.USER_TAG_PATTERN)) {
                display_name = display_name.trim();
                if (display_name === "") continue;

                const member = this.guild.members.cache.find(member => member.displayName.startsWith(display_name));
                if (member) this.users.set(member.user.id, member.user);
                else {
                    const display_name_lowercase = display_name.toLowerCase();
                    const member = this.guild.members.cache.find(member =>
                        member.displayName.toLowerCase().startsWith(display_name_lowercase)
                    );
                    if (member) this.users.set(member.user.id, member.user);
                    else {
                        const member = this.guild.members.cache.find(member =>
                            member.user.username.toLowerCase().startsWith(display_name_lowercase)
                        );
                        if (member) this.users.set(member.user.id, member.user);
                    }
                }
            }
        }
    }

    /**
     * Regular expression that globally matches `@everyone` and `@here`
     */
    static EVERYONE_PATTERN = /@(everyone|here)/g;

    /**
     * Regular expression that globally matches user mentions like `<@81440962496172032>`
     */
    static USERS_PATTERN = /<@!?(\d{17,19})>/g;

    /**
     * Regular expression that globally matches user mentions like `Loneless#0893`
     */
    static USER_TAG_PATTERN = /@?([^@#:]{2,32})#([0-9]{4})/g;

    /**
     * Regular expression that globally matches role mentions like `<@&297577916114403338>`
     */
    static ROLES_PATTERN = /<@&(\d{17,19})>/g;

    /**
     * Regular expression that globally matches channel mentions like `<#222079895583457280>`
     */
    static CHANNELS_PATTERN = /<#(\d{17,19})>/g;
}
