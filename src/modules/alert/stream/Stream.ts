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
import StreamConfig, { StreamDocument } from "./StreamConfig";

export default class Stream extends StreamConfig {
    public manager: import("../AlertManager");

    public messageId: string | null;
    public lastChannelId: string | null;

    constructor(
        manager: import("../AlertManager"),
        service: import("../processor/Processor"),
        channel: Discord.TextChannel | null,
        nsfwChannel: Discord.TextChannel | null,
        sfwChannel: Discord.TextChannel | null,
        conf: StreamDocument = {}
    ) {
        super(service, channel, nsfwChannel, sfwChannel, conf);

        this.manager = manager;

        this.messageId = conf.messageId || null;
        this.lastChannelId = conf.lastChannelId || null;
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
        this.messageId = null;
        this.lastChannelId = null;
        if (!onlineMessage || !(onlineMessage.deletable && !onlineMessage.deleted)) return;

        await onlineMessage.delete().catch(doNothing);
    }

    public get lastChannel(): Discord.TextChannel | null {
        if (!this.guild) return null;
        if (!this.lastChannelId) return null;

        const channel = this.guild.channels.cache.get(this.lastChannelId);
        if (!channel) return null;

        return channel as Discord.TextChannel;
    }

    public async fetch() {
        if (!this.messageId) return;

        const channel = this.lastChannel;
        if (!channel) return;

        return await channel.messages.fetch(this.messageId).catch(doNothing);
    }
}
