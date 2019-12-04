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

// eslint-disable-next-line no-unused-vars
const Discord = require("discord.js");

class Channel {
    constructor(manager, service, channel, conf = {}) {
        /** @type {AlertManager} */
        this.manager = manager;
        /** @type {PicartoProcessor|TwitchProcessor|PiczelProcessor|SmashcastProcessor} */
        this.service = service;
        /** @type {Discord.TextChannel} */
        this.channel = channel;

        this.userId = conf.userId;
        this.name = conf.name;
        this.messageId = conf.messageId;
        this._id = conf._id;
    }

    get url() {
        return this.getURL(false);
    }

    getURL(fat = false) {
        return this.service.formatURL(this, fat);
    }

    async delete() {
        if (!this.messageId) return;

        const onlineMessage = await this.channel.fetchMessage(this.messageId).catch(() => { /* Do nothing */ });
        this.messageId = null;
        if (!onlineMessage || !(onlineMessage.deletable && !onlineMessage.deleted)) return;

        await onlineMessage.delete().catch(() => { /* Do nothing */ });
    }
}

module.exports = Channel;
