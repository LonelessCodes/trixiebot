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

const Discord = require("discord.js");
const { EventEmitter } = require("events");

// eslint-disable-next-line no-unused-vars
const LocaleManager = require("../../core/managers/LocaleManager");
const Translation = require("../i18n/Translation");

const Config = require("./Config");
const Channel = require("./Channel");
const ChannelQueryCursor = require("./ChannelQueryCursor");

class AlertManager extends EventEmitter {
    /**
     * @param {Db} db
     * @param {LocaleManager} locale
     * @param {Discord.Client} client
     * @param {StreamProcessor[]} services
     */
    constructor(db, locale, client, services) {
        super();

        /** @type {OnlineChannel[]} */
        this.online = [];

        this.database = db.collection("alert");
        this.db_config = db.collection("alert_config");
        this.locale = locale;
        this.client = client;

        /** @type {StreamProcessor[]} */
        this.services = [];
        this.services_mapped = {};

        return new Promise(async resolve => {
            for (let Service of services) {
                const service = await new Service(this);
                service.on("offline", async oldChannel => {
                    if (!oldChannel) return;

                    this.online.splice(this.online.indexOf(oldChannel), 1);

                    await this.database.updateOne({
                        _id: oldChannel._id,
                    }, { $set: { messageId: null } });

                    if (await this.isCleanup(oldChannel.channel.guild))
                        await oldChannel.delete();
                });
                service.on("online", async channel => {
                    if (channel.channel.deleted) {
                        await this.removeChannel(channel);
                        return;
                    }
                    if (!channel.channel.permissionsFor(channel.channel.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES)) return;

                    const embed = await channel.getEmbed();

                    const onlineMessage = await this.locale.send(
                        channel.channel,
                        new Translation("alert.announcement", "{{user}} is live on {{service}}!", {
                            user: channel.name,
                            service: channel.service.display_name,
                        }),
                        { embed }
                    );

                    channel.setMessage(onlineMessage);

                    this.online.push(channel);

                    await this.database.updateOne({
                        _id: channel._id,
                    }, {
                        $set: {
                            name: channel.name,
                            messageId: onlineMessage.id,
                        },
                    });
                });
                this.services.push(service);
                this.services_mapped[service.name] = service;
            }

            resolve(this);
        });
    }

    getConfigs(service) {
        const stream = this.database.find({ service: service.name });

        return new ChannelQueryCursor(stream, this, service);
    }

    /**
     * @param {Discord.TextChannel} channel
     * @param {string} url
     * @returns {Config}
     */
    async parseConfig(channel, url) {
        for (let service of this.services) {
            if (!service.testURL(url)) continue;

            return await service.getChannel(channel, url);
        }

        return null;
    }

    /**
     * @param {Config} config
     */
    async addChannel(config) {
        for (let service of this.services) {
            if (service.name !== config.service.name) continue;

            await this.database.insertOne({
                service: config.service.name,
                guildId: config.channel.guild.id,
                channelId: config.channel.id,
                userId: config.userId,
                name: config.name,
                messageId: null,
            });

            return await service.addChannel(config);
        }
    }

    /**
     * @param {Config} config
     */
    async removeChannel(config) {
        for (let service of this.services) {
            if (service.name !== config.service.name) continue;

            await this.database.deleteOne({ _id: config._id });

            await service.removeChannel(config);

            return;
        }
    }

    async getChannels(guild) {
        const configs = await this.database.find({
            guildId: guild.id,
        }).toArray();

        const channels = [];
        for (let config of configs) {
            const service = this.services_mapped[config.service];
            if (!service) continue;

            const channel = guild.channels.get(config.channelId);
            if (!channel) {
                await this.removeChannel(new Config(service, channel, config.name, config.userId, config._id));
                continue;
            }

            channels.push(new Channel(this, service, channel, config));
        }

        return channels;
    }

    getOnlineChannels(guild) {
        return this.online.filter(online => online.channel.guild.id === guild.id);
    }

    async isCompact(guild) {
        return !!await this.db_config.findOne({ guildId: guild.id, compact: true });
    }

    async setCompact(guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { compact: true } }, { upsert: true });
    }

    async unsetCompact(guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { compact: false } }, { upsert: true });
    }

    async isCleanup(guild) {
        return !await this.db_config.findOne({ guildId: guild.id, cleanup: false });
    }

    async setCleanup(guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { cleanup: true } }, { upsert: true });
    }

    async unsetCleanup(guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { cleanup: false } }, { upsert: true });
    }
}

module.exports = AlertManager;
