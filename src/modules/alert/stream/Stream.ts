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
import { doNothing } from "../../../util/util";
import StreamConfig, { StreamConfigOptions } from "./StreamConfig";

export interface StreamOptions extends StreamConfigOptions {
    username: string;
    userId: string;
}

export default class Stream extends StreamConfig implements StreamOptions {
    public manager: import("../AlertManager");

    public username: string;
    public userId: string;
    public messageId?: string;
    public lastChannelId?: string;

    constructor(
        manager: import("../AlertManager"),
        service: import("../processor/Processor"),
        channel: Discord.TextChannel | null,
        nsfwChannel: Discord.TextChannel | null,
        sfwChannel: Discord.TextChannel | null,
        conf: StreamOptions
    ) {
        super(service, channel, nsfwChannel, sfwChannel, conf);

        this.manager = manager;

        this.username = conf.username;
        this.userId = conf.userId;
        this.messageId = conf.messageId;
        this.lastChannelId = conf.lastChannelId;
    }

    public get url() {
        return this.getURL(false);
    }

    public getURL(fat = false) {
        return this.service.formatURL(this, fat);
    }

    public async delete() {
        if (!this.messageId) return;

        const onlineMessage = await this.fetch();
        this.messageId = undefined;
        this.lastChannelId = undefined;
        if (!onlineMessage || !(onlineMessage.deletable && !onlineMessage.deleted)) return;

        await onlineMessage.delete().catch(doNothing);
    }

    public get lastChannel(): Discord.TextChannel | undefined {
        if (!this.guild) return undefined;
        if (!this.lastChannelId) return undefined;

        const channel = this.guild.channels.cache.get(this.lastChannelId);
        if (!channel) return undefined;

        return channel as Discord.TextChannel;
    }

    public async fetch() {
        if (!this.messageId) return;

        const channel = this.lastChannel;
        if (!channel) return;

        return await channel.messages.fetch(this.messageId).catch(doNothing);
    }
}
