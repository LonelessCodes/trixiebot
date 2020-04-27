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

const { doNothing } = require("../../../util/util");
const StreamConfig = require("./StreamConfig");

class Stream extends StreamConfig {
    constructor(manager, service, channel, nsfwChannel, sfwChannel, conf = {}) {
        super(service, channel, nsfwChannel, sfwChannel, conf);

        /** @type {AlertManager} */
        this.manager = manager;

        /** @type {string} */
        this.messageId = conf.messageId;
        /** @type {string} */
        this.lastChannelId = conf.lastChannelId;
    }

    get url() {
        return this.getURL(false);
    }

    getURL(fat = false) {
        return this.service.formatURL(this, fat);
    }

    async delete() {
        if (!this.messageId) return;

        const onlineMessage = await this.fetch();
        this.messageId = null;
        this.lastChannelId = null;
        if (!onlineMessage || !(onlineMessage.deletable && !onlineMessage.deleted)) return;

        await onlineMessage.delete().catch(doNothing);
    }

    get lastChannel() {
        if (!this.guild) return;
        return this.guild.channels.cache.get(this.lastChannelId);
    }

    async fetch() {
        if (!this.messageId) return;

        const channel = this.lastChannel;
        if (!channel) return;

        return await channel.messages.fetch(this.messageId).catch(doNothing);
    }
}

module.exports = Stream;
