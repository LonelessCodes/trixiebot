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

const log = require("../../log").default.namespace("alert manager");
import { doNothing } from "../../util/util";
import { EventEmitter } from "events";
import Discord from "discord.js";
import mongo from "mongodb";

import LocaleManager from "../../core/managers/LocaleManager";
import Translation from "../i18n/Translation";

import OnlineStream from "./stream/OnlineStream";
import Stream from "./stream/Stream";
import StreamConfig from "./stream/StreamConfig";
import ParsedStream from "./stream/ParsedStream";

import Processor from "./processor/Processor";

interface StreamDocument {
    _id: mongo.ObjectId;
    service: string;
    guildId: string;
    channelId: string | null;
    nsfwChannelId: string | null;
    sfwChannelId: string | null;
    userId: string;
    name: string;
    messageId: string | null;
    lastChannelId: string | null;
}

interface GuildDocument {
    _id: mongo.ObjectId;
    guildId: string;
}

class AlertManager extends EventEmitter {
    online: OnlineStream[] = [];

    database: mongo.Collection<StreamDocument>;
    db_config: mongo.Collection<GuildDocument>;
    locale: LocaleManager;
    client: Discord.Client;

    services: Processor[] = [];
    services_mapped: { [name: string]: Processor | undefined } = {};

    constructor(
        db: mongo.Db,
        locale: LocaleManager,
        client: Discord.Client,
        // instead of "typeof Processor", bc can't create instance of abstract class
        services: (new (manager: AlertManager) => Processor)[]
    ) {
        super();

        this.database = db.collection("alert");
        this.db_config = db.collection("alert_config");
        this.locale = locale;
        this.client = client;

        const setOnline = async (stream: OnlineStream) => {
            const channel = stream.curr_channel;
            if (!channel) return;

            // TODO: remove config logic is actually inside docToStream()
            // need centeralized way to get configs on demand and removes unneccessary configs
            if (
                (!stream.channel || stream.channel.deleted) &&
                (!stream.sfwChannel || stream.sfwChannel.deleted) &&
                (!stream.nsfwChannel || stream.nsfwChannel.deleted)
            ) {
                await this.removeStreamConfig(stream);
                return;
            }
            if (channel.deleted) return;

            const embed = await stream.generateEmbed();

            const onlineMessage = await this.locale.send(
                channel,
                new Translation("alert.announcement", "{{user}} is live on {{service}}!", {
                    user: `**${stream.username}**`,
                    service: stream.service.display_name,
                }),
                embed
            );

            stream.setMessage(onlineMessage);

            this.online.push(stream);

            await this.database.updateOne(
                {
                    _id: stream._id,
                },
                {
                    $set: {
                        name: stream.username,
                        messageId: onlineMessage.id,
                        lastChannelId: onlineMessage.channel.id,
                    },
                }
            );
        };

        for (const Service of services) {
            const service: Processor = new Service(this);

            service.on("offline", async (stream: Stream) => {
                const index = this.findOnlineIndex(stream);
                if (index > -1) {
                    stream = this.online[index];
                    this.online.splice(index, 1);
                }

                await this.database.updateOne({ _id: stream._id }, { $set: { messageId: null, lastChannelId: null } });

                if (await this.isCleanup(stream.guild)) await stream.delete();
            });

            service.on("change", async (stream: OnlineStream) => {
                const index = this.findOnlineIndex(stream);
                if (index > -1) {
                    const oldStream = this.online[index];
                    this.online.splice(index, 1);

                    if (await this.isCleanup(oldStream.guild)) oldStream.delete().catch(doNothing);
                }

                await setOnline(stream);
            });

            service.on("online", (stream: OnlineStream) => setOnline(stream));

            this.services.push(service);
            this.services_mapped[service.name] = service;
        }
    }

    findOnlineIndex(config: StreamConfig): number {
        return this.online.findIndex(
            stream => config.service === stream.service && config.guild.id === stream.guild.id && config.userId === stream.userId
        );
    }
    findOnline(config: StreamConfig): OnlineStream | undefined {
        return this.online.find(
            stream => config.service === stream.service && config.guild.id === stream.guild.id && config.userId === stream.userId
        );
    }

    getService(url: string): Processor | undefined {
        for (const service of this.services) if (service.testURL(url)) return service;
    }

    docToStream(raw: StreamDocument) {
        // mask to proper stream options
        const doc = { ...raw, username: raw.name };

        const service = this.services_mapped[doc.service];
        if (!service) return;

        const guild = this.client.guilds.cache.get(doc.guildId);
        if (!guild) return;
        if (!guild.available) return;

        const def_channel = doc.channelId ? (guild.channels.cache.get(doc.channelId) as Discord.TextChannel) : undefined;
        const nsfw_channel = doc.nsfwChannelId ? (guild.channels.cache.get(doc.nsfwChannelId) as Discord.TextChannel) : undefined;
        const sfw_channel = doc.sfwChannelId ? (guild.channels.cache.get(doc.sfwChannelId) as Discord.TextChannel) : undefined;
        if (!def_channel && !nsfw_channel && !sfw_channel) {
            this.removeStreamConfig(new StreamConfig(service, null, null, null, guild, doc)).catch(log.error);
            return;
        }

        const online = this.online.find(
            online => online.service.name === service.name && online.guild.id === guild.id && online.userId === doc.userId
        );
        if (online) return online;

        return new Stream(this, service, def_channel || null, nsfw_channel || null, sfw_channel || null, guild, doc);
    }

    getConfigsStream(query: mongo.FilterQuery<StreamDocument>): mongo.Cursor<Stream> {
        return this.database.find(query).map(raw => this.docToStream(raw)) as mongo.Cursor<Stream>;
    }
    getServiceConfigsStream(service: Processor): mongo.Cursor<Stream> {
        return this.getConfigsStream({ service: service.name });
    }
    getStreamConfigs(guild: Discord.Guild) {
        // Cursor automatically removes undefined docs from the result - to our advantage
        return this.getConfigsStream({ guildId: guild.id }).toArray();
    }

    async getStreamConfig(guild: Discord.Guild, parsed: ParsedStream): Promise<Stream | undefined> {
        const raw = await this.database.findOne({
            service: parsed.service.name,
            guildId: guild.id,
            userId: parsed.userId,
        });
        if (!raw) return;

        return this.docToStream(raw);
    }

    async addStreamConfig(config: StreamConfig) {
        const service = this.services_mapped[config.service.name];
        if (!service) return;

        await this.database.insertOne({
            service: config.service.name,
            guildId: config.guild.id,
            channelId: config.channel && config.channel.id,
            nsfwChannelId: config.nsfwChannel && config.nsfwChannel.id,
            sfwChannelId: config.sfwChannel && config.sfwChannel.id,
            userId: config.userId,
            name: config.username,
            messageId: null,
            lastChannelId: null,
        });

        service.addStreamConfig(config);

        return new Stream(this, service, config.channel, config.nsfwChannel, config.sfwChannel, config.guild, {
            ...config,
            messageId: null,
            lastChannelId: null,
        });
    }

    async removeStreamConfig(config: StreamConfig) {
        // Remove from online streams
        const index = this.findOnlineIndex(config);
        if (index > -1) {
            const stream = this.online[index];
            this.online.splice(index, 1);
            if (await this.isCleanup(stream.guild)) await stream.delete().catch(doNothing);
        }

        const service = this.services_mapped[config.service.name];
        if (!service) return;

        await this.database.deleteOne({ _id: config._id });

        service.removeStreamConfig(config);
    }

    // Config stuff

    async isCompact(guild: Discord.Guild) {
        return !!(await this.db_config.findOne({ guildId: guild.id, compact: true }));
    }

    async setCompact(guild: Discord.Guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { compact: true } }, { upsert: true });
    }

    async unsetCompact(guild: Discord.Guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { compact: false } }, { upsert: true });
    }

    async isCleanup(guild: Discord.Guild) {
        return !(await this.db_config.findOne({ guildId: guild.id, cleanup: false }));
    }

    async setCleanup(guild: Discord.Guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { cleanup: true } }, { upsert: true });
    }

    async unsetCleanup(guild: Discord.Guild) {
        await this.db_config.updateOne({ guildId: guild.id }, { $set: { cleanup: false } }, { upsert: true });
    }
}

export default AlertManager;
