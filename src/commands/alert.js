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

const fetch = require("node-fetch");
const log = require("../log").namespace("alert cmd");
const CONST = require("../const");
const Discord = require("discord.js");
const gm = require("gm");
const { EventEmitter } = require("events");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandPermission = require("../util/commands/CommandPermission");

// eslint-disable-next-line no-unused-vars
const LocaleManager = require("../core/managers/LocaleManager");
const Translation = require("../modules/i18n/Translation");
const TranslationMerge = require("../modules/i18n/TranslationMerge");
const TranslationEmbed = require("../modules/i18n/TranslationEmbed");
const NumberFormat = require("../modules/i18n/NumberFormat");

const config = require("../config");

const { default: TwitchClient } = require("twitch");

async function nsfwThumb(url) {
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) throw new Error("Thumbnail could not be loaded");

    const in_stream = response.body;

    return await new Promise((res, rej) => {
        gm(in_stream, "thumb.jpg")
            .size({ bufferStream: true }, function size(err, size) {
                if (err) return rej(err);
                this.resize(420, 236)
                    .blur(35, 9)
                    .region(size.width, size.height, 0, 0)
                    .gravity("Center")
                    .fill("white")
                    .fontSize(size.width / 10)
                    .font("Open Sans")
                    .drawText(0, 0, "N S F W")
                    .quality(85)
                    .stream("jpeg", (err, out_stream) => {
                        if (err) return rej(err);
                        res(out_stream);
                    });
            });
    });
}

class StreamProcessor extends EventEmitter {
    /**
     * @param {Manager} manager
     */
    constructor(manager) {
        super();
        this.manager = manager;
        this.database = manager.database;
        this.client = manager.client;

        /** @type {OnlineChannel[]} */
        this.online = [];

        this.on("online", channel => this.online.push(channel));
        this.on("offline", channel => this.removeChannel(channel));
    }

    testURL() {
        return false;
    }

    async getDBEntry(guild, userId) {
        return await this.database.findOne({
            service: this.name,
            guildId: guild.id,
            userId: userId,
        });
    }

    formatURL() { return ""; }

    addChannel(config) {
        return new Channel(this.manager, this, config.channel, config);
    }

    /**
     * @param {Config|Channel} config
     */
    removeChannel(config) {
        if (config.channel) {
            const oldChannel = this.online.findIndex(oldChannel =>
                oldChannel.channel.guild.id === config.channel.guild.id &&
                oldChannel.userId === config.userId);
            if (oldChannel >= 0)
                this.online.splice(oldChannel, 1);
        } else if (config._id) {
            const oldChannel = this.online.findIndex(oldChannel => oldChannel._id === config._id);
            if (oldChannel >= 0)
                this.online.splice(oldChannel, 1);
        }
    }
}

class Picarto extends StreamProcessor {
    constructor(manager) {
        super(manager);

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.picarto\.tv|picarto\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,25}\b/.test(url);
    }

    async getChannel(channel, url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.picarto\.tv|picarto\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,25})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new Config(this, channel);

        let channelPage;
        try {
            channelPage = await this.request("channel/name/" + channel_name);
        } catch (err) {
            return new Config(this, channel, channel_name);
        }

        const user_id = channelPage.user_id.toString();

        const savedConfig = await this.getDBEntry(channel.guild, user_id);
        if (savedConfig) return new Config(this, channel, channel_name, user_id, savedConfig._id);

        return new Config(this, channel, channel_name, user_id);
    }

    formatURL(channel, fat = false) {
        if (fat) return this.url + "/**" + channel.name + "**";
        else return "https://" + this.url + "/" + channel.name;
    }

    async request(api) {
        const r = await fetch(this.base + api);
        return await r.json();
    }

    async checkChanges() {
        // get all online channels
        try {
            /** @type {any[]} */
            const picartoOnline = await this.request("online?adult=true");

            const stream = this.manager.getConfigs(this);

            stream.addListener("data", config => this.checkChange(picartoOnline, config));
            stream.once("end", () => { /* Do nothing */ });
            stream.once("error", err => { log(err); });
        } catch (_) { _; } // Picarto is down
    }

    /**
     * @param {any[]} picartoOnline
     * @param {Channel} savedConfig
     */
    async checkChange(picartoOnline, savedConfig) {
        const oldChannel = this.online.find(oldChannel =>
            savedConfig.userId === oldChannel.userId &&
            savedConfig.channel.guild.id === oldChannel.channel.guild.id);

        let channelPage = picartoOnline.find(channelPage => savedConfig.userId === channelPage.user_id.toString());
        if (!channelPage) {
            // remove the channel from the recently online list
            if (savedConfig.messageId || oldChannel) this.emit("offline", oldChannel || savedConfig);
        } else {
            // if the channel was not recently online, set it online
            if (oldChannel || savedConfig.messageId) return;

            try {
                channelPage = await this.request("channel/id/" + channelPage.user_id);

                const onlineChannel = new OnlineChannel(savedConfig, {
                    title: channelPage.title,
                    followers: channelPage.followers,
                    totalviews: channelPage.viewers_total,
                    avatar: channelPage.avatar,
                    nsfw: channelPage.adult,
                    category: channelPage.category,
                    tags: channelPage.tags,
                    thumbnail: channelPage.thumbnails.web_large,
                });

                this.emit("online", onlineChannel);
            } catch (_) { _; } // Picarto is down
        }
    }

    get base() { return "https://api.picarto.tv/v1/"; }
    get url() { return "picarto.tv"; }
    get name() { return "picarto"; }
    get display_name() { return "Picarto"; }
    get color() { return 0x1DA456; }
}

class Twitch extends StreamProcessor {
    constructor(manager) {
        super(manager);

        return new Promise(async resolve => {
            this.twitch = await TwitchClient.withCredentials(config.get("twitch.client_id"));

            setInterval(() => this.checkChanges(), 60 * 1000);
            this.checkChanges();

            resolve(this);
        });
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.twitch\.tv|twitch\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async getChannel(channel, url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.twitch\.tv|twitch\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new Config(this, channel);

        const user = await this.twitch.helix.users.getUserByName(channel_name);
        if (!user) return new Config(this, channel, channel_name);

        const user_id = user.id;
        const name = user.displayName;

        const savedConfig = await this.getDBEntry(channel.guild, user_id);
        if (savedConfig) return new Config(this, channel, name, user_id, savedConfig._id);

        return new Config(this, channel, name, user_id);
    }

    formatURL(channel, fat = false) {
        if (fat) return this.url + "/**" + channel.name + "**";
        else return "https://" + this.url + "/" + channel.name;
    }

    async checkChanges() {
        const channels = await this.manager.getConfigs(this).toArray();
        if (channels.length === 0) return;

        const set = new Set(channels.map(c => c.userId));

        const online_channels = await this.twitch.kraken.streams.getStreams(Array.from(set));

        for (let config of channels) await this.checkChange(config, online_channels).catch(err => log.error(err));
    }

    async checkChange(config, online_channels) {
        const oldChannel = this.online.find(oldChannel =>
            config.userId === oldChannel.userId &&
            config.channel.guild.id === oldChannel.channel.guild.id);

        const channelPage = online_channels.find(channelPage => config.userId === channelPage.channel.id.toString());
        if (!channelPage) {
            // remove the channel from the recently online list
            if (config.messageId || oldChannel) this.emit("offline", oldChannel || config);
        } else {
            // if the channel was not recently online, set it online
            if (oldChannel || config.messageId) return;

            const stream = await this.twitch.helix.streams.getStreamByUserId(config.userId);
            if (!stream) return;

            const onlineChannel = new OnlineChannel(config, {
                title: stream.title,
                followers: channelPage.channel.followers,
                totalviews: channelPage.channel.views,
                avatar: channelPage.channel.logo,
                game: channelPage.game,
                thumbnail: channelPage.getPreviewUrl("large"),
                language: stream.language,
                nsfw: channelPage.channel.isMature,
            });

            this.emit("online", onlineChannel);
        }
    }

    get url() { return "twitch.tv"; }
    get name() { return "twitch"; }
    get display_name() { return "Twitch"; }
    get color() { return 0x6441A4; }
}

class Piczel extends StreamProcessor {
    constructor(manager) {
        super(manager);

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.piczel\.tv|piczel\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async getChannel(channel, url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.piczel\.tv|piczel\.tv)\/watch\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new Config(this, channel);

        try {
            let channelPage = await this.request("streams/" + channel_name);
            if (channelPage.error || !channelPage.data[0] || !channelPage.data[0].user) return new Config(this, channel, channel_name);

            channelPage = channelPage.data[0];

            const user_id = channelPage.user.id.toString();
            const name = channelPage.user.username;

            const savedConfig = await this.getDBEntry(channel.guild, user_id);
            if (savedConfig) return new Config(this, channel, name, user_id, savedConfig._id);

            return new Config(this, channel, name, user_id);
        } catch (err) {
            return new Config(this, channel, channel_name);
        }
    }

    formatURL(channel, fat = false) {
        if (fat) return this.url + "/watch/**" + channel.name + "**";
        else return "https://" + this.url + "/watch/" + channel.name;
    }

    async request(api) {
        const r = await fetch(this.base + api);
        return await r.json();
    }

    async checkChanges() {
        // get all online channels
        try {
            const piczelOnline = await this.request("streams/?nsfw=true&live_only=false");
            if (piczelOnline.error) throw new Error("Piczel error:", piczelOnline.error);

            const stream = this.manager.getConfigs(this);

            stream.addListener("data", config => this.checkChange(piczelOnline, config));
            stream.once("end", () => { /* Do nothing */ });
            stream.once("error", err => { log(err); });
        } catch (_) { _; } // Piczel is down
    }

    /**
     * @param {any} piczelOnline
     * @param {Channel} savedConfig
     */
    checkChange(piczelOnline, savedConfig) {
        const oldChannel = this.online.find(oldChannel =>
            savedConfig.userId === oldChannel.userId &&
            savedConfig.channel.guild.id === oldChannel.channel.guild.id);

        const channelPage = piczelOnline.find(channelPage => savedConfig.userId === channelPage.user.id.toString());
        if (!channelPage) {
            // remove the channel from the recently online list
            if (savedConfig.messageId || oldChannel) this.emit("offline", oldChannel || savedConfig);
        } else {
            // if the channel was not recently online, set it online
            if (oldChannel || savedConfig.messageId) return;

            const onlineChannel = new OnlineChannel(savedConfig, {
                title: channelPage.title,
                followers: channelPage.follower_count,
                avatar: channelPage.user.avatar ? channelPage.user.avatar.avatar.url : null,
                nsfw: channelPage.adult,
                tags: channelPage.tags,
                thumbnail: `https://piczel.tv/static/thumbnail/stream_${channelPage.id}.jpg`,
            });

            this.emit("online", onlineChannel);
        }
    }

    get base() { return "https://piczel.tv/api/"; }
    get url() { return "piczel.tv"; }
    get name() { return "piczel"; }
    get display_name() { return "Piczel.tv"; }
}

class Smashcast extends StreamProcessor {
    constructor(manager) {
        super(manager);

        setInterval(() => this.checkChanges(), 60 * 1000);
        this.checkChanges();
    }

    testURL(url) {
        return /^(http:\/\/|https:\/\/)?(www\.smashcast\.tv|smashcast\.tv)\/[-a-zA-Z0-9@:%_+.~]{2,}\b/.test(url);
    }

    async request(api) {
        const r = await fetch(this.base + api);
        const json = await r.json();
        if (json.error == true) throw new Error(json.error_msg);
        return json;
    }

    async getChannel(channel, url) {
        const regexp = /^(?:http:\/\/|https:\/\/)?(?:www\.smashcast\.tv|smashcast\.tv)\/([-a-zA-Z0-9@:%_+.~]{2,})\b/;

        const [, channel_name] = regexp.exec(url) || [];

        if (!channel_name) return new Config(this, channel);

        let channelPage;
        try {
            channelPage = await this.request("user/" + channel_name);
            if (channelPage.user_name === null) throw new Error("User does not exist");

            const user_id = channelPage.user_id;
            const name = channelPage.user_name;

            const savedConfig = await this.getDBEntry(channel.guild, user_id);
            if (savedConfig) return new Config(this, channel, name, user_id, savedConfig._id);

            return new Config(this, channel, name, user_id);
        } catch (err) {
            return new Config(this, channel, channel_name);
        }
    }

    formatURL(channel, fat = false) {
        if (fat) return this.url + "/**" + channel.name + "**";
        else return "https://" + this.url + "/" + channel.name;
    }

    async checkChanges() {
        const channels = await this.manager.getConfigs(this).toArray();
        if (channels.length === 0) return;

        const set = new Set(channels.map(c => c.name));

        try {
            const online_channels = await this.request("media/live/" + Array.from(set).join(","));

            const online = online_channels.livestream.filter(stream => stream.media_is_live !== "0");

            for (let config of channels) await this.checkChange(config, online).catch(err => log.error(err));
        } catch (_) { _; } // Smashcast is down
    }

    async checkChange(config, online_channels) {
        const oldChannel = this.online.find(oldChannel =>
            config.userId === oldChannel.userId &&
            config.channel.guild.id === oldChannel.channel.guild.id);

        const stream = online_channels.find(stream => config.userId === stream.media_user_id);
        if (!stream) {
            // remove the channel from the recently online list
            if (config.messageId || oldChannel) this.emit("offline", oldChannel || config);
        } else {
            // if the channel was not recently online, set it online
            if (oldChannel || config.messageId) return;

            const views = await this.request("media/views/" + config.name);
            const media_base = "https://edge.sf.hitbox.tv";

            const onlineChannel = new OnlineChannel(config, {
                totalviews: views.total_live_views ? parseInt(views.total_live_views) : 0,
                title: stream.media_status || stream.media_title,
                avatar: media_base + stream.channel.user_logo,
                followers: parseInt(stream.channel.followers),
                thumbnail: media_base + stream.media_thumbnail_large,
                language: stream.media_countries ? stream.media_countries[0] : null,
                category: stream.category_name,
                nsfw: !!stream.media_mature,
            });

            this.emit("online", onlineChannel);
        }
    }

    get base() { return "https://api.smashcast.tv/"; }
    get url() { return "smashcast.tv"; }
    get name() { return "smashcast"; }
    get display_name() { return "Smashcast"; }
    get color() { return 0x208EFC; }
}

class ChannelQueryCursor {
    constructor(db_cursor, manager, service) {
        this.manager = manager;
        this.service = service;
        this._cursor = db_cursor;
    }

    addListener(scope, handler) {
        switch (scope) {
            case "data":
                this._cursor.addListener("data", config => {
                    const channel = this.process(config);
                    if (!channel) return;

                    handler(channel);
                });
                break;
            default:
                this._cursor.addListener(scope, handler);
                break;
        }
    }

    once(scope, handler) {
        switch (scope) {
            case "data":
                this._cursor.once("data", config => {
                    const channel = this.process(config);
                    if (!channel) return;

                    handler(channel);
                });
                break;
            default:
                this._cursor.once(scope, handler);
                break;
        }
    }

    /**
     * @returns {Channel[]}
     */
    async toArray() {
        const arr = await this._cursor.toArray();
        return arr.map(c => this.process(c)).filter(c => !!c);
    }

    /**
     * @param {any} config
     * @returns {Channel}
     */
    process(config) {
        const guild = this.manager.client.guilds.get(config.guildId);
        if (!guild) {
            this.manager.removeChannel(new Config(this.service, null, config.name, config.userId, config._id));
            return null;
        }
        if (!guild.available) return null;

        const g_channel = guild.channels.get(config.channelId);
        if (!g_channel) {
            this.manager.removeChannel(new Config(this.service, null, config.name, config.userId, config._id));
            return null;
        }

        const online = this.manager.online.find(online =>
            online.service === this.service.name &&
            online.channel.id === g_channel.id &&
            online.userId === config.userId);
        if (online) return online;

        return new Channel(this.manager, this.service, g_channel, config);
    }
}

class Manager extends EventEmitter {
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

class Channel {
    constructor(manager, service, channel, conf = {}) {
        /** @type {Manager} */
        this.manager = manager;
        /** @type {Picarto|Twitch|Piczel|Smashcast} */
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

class OnlineChannel extends Channel {
    constructor(manager, service, channel, conf = {}) {
        if (manager instanceof Channel && arguments.length === 2) {
            conf = service;
            super(manager.manager, manager.service, manager.channel, manager);
        } else {
            super(manager, service, channel, conf);
        }

        this.title = conf.title;
        this.totalviews = conf.totalviews;
        this.followers = conf.followers;
        this.avatar = conf.avatar;
        this.thumbnail = conf.thumbnail;
        this.nsfw = !!conf.nsfw;
        this.category = conf.category;
        this.game = conf.game;
        this.language = conf.language;
        this.tags = conf.tags;

        this.message = null;
    }

    setMessage(m) {
        this.message = m;
    }

    async delete() {
        if (this.messageId && !this.message) {
            const onlineMessage = await this.channel.fetchMessage(this.messageId).catch(() => { /* Do nothing */ });
            this.messageId = null;
            if (!onlineMessage) return;
            this.message = onlineMessage;
        }

        if (this.message && this.message.deletable && !this.message.deleted)
            await this.message.delete().catch(() => { /* Do nothing */ });

        this.messageId = null;
        this.message = null;
    }

    async getEmbed() {
        const footer = new TranslationMerge().separator(" | ");
        if (this.nsfw) footer.push(new Translation("alert.embed.nsfw", "NSFW"));
        if (this.category) footer.push(new TranslationMerge(new Translation("alert.embed.category", "Category:"), this.category));
        if (this.game) footer.push(new TranslationMerge(new Translation("alert.embed.game", "Game:"), this.game));
        if (this.tags && this.tags.length > 0) footer.push(new TranslationMerge(new Translation("alert.embed.tags", "Tags:"), this.tags.join(", ")));

        const blur = this.thumbnail ?
            !this.channel.nsfw ?
                this.nsfw :
                false :
            false;
        /** @type {Discord.Attachment} */

        let attachment;
        try {
            attachment = new Discord.Attachment(await nsfwThumb(this.thumbnail), "thumb.jpg");
        } catch (_) {
            _;
        }

        const can_use_blur = blur && attachment;
        const thumbnail = can_use_blur ?
            "attachment://thumb.jpg" :
            !blur && this.thumbnail ?
                `${this.thumbnail}?${Date.now()}` :
                null;
        const embed = new TranslationEmbed()
            .setColor(this.service.color || CONST.COLOR.PRIMARY)
            .setURL(this.url);

        if (await this.manager.isCompact(this.channel.guild)) {
            embed.setAuthor(this.name, this.avatar, this.url);
            if (thumbnail) {
                if (can_use_blur) embed.attachFile(attachment);
                embed.setImage(thumbnail);
            }
            embed.setFooter(footer);

            return embed;
        } else {
            embed.setAuthor(this.name)
                .setTitle(this.title)
                .setThumbnail(this.avatar);
            if (this.followers != null) embed.addField(new Translation("alert.embed.followers", "Followers"), new NumberFormat(this.followers), true);
            if (this.totalviews != null) embed.addField(new Translation("alert.embed.viewers", "Total Viewers"), new NumberFormat(this.totalviews), true);
            if (thumbnail) {
                if (can_use_blur) embed.attachFile(attachment);
                embed.setImage(thumbnail);
            }
            embed.setFooter(footer);

            return embed;
        }
    }
}

class Config {
    constructor(service, channel, name, userId, _id) {
        this.service = service;
        this.channel = channel || null;
        this.name = name || null;
        this.userId = userId || null;
        this._id = _id || null;
    }
}

module.exports = async function install(cr, { client, locale, db }) {
    const services = [Picarto, Piczel, Smashcast];
    if (config.has("twitch.client_id")) services.push(Twitch);
    else log.namespace("config", "Found no API client ID for Twitch - Disabled alerting Twitch streams");

    const manager = await new Manager(db, locale, client, services);

    const alertCommand = cr.registerCommand("alert", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Make Trixie announce streamers when they go live.\nSupported are Picarto, Piczel, Twitch and Smashcast.")
            .setUsage("<page url> <?channel>", "Subscribe Trixie to a streaming channel!")
            .addParameter("page url", "copy the url of the stream page and paste it in here")
            .addParameterOptional("channel", "the channel to post the alert to later. If omitted will be this channel"))
        .setCategory(Category.UTILS)
        .setPermissions(new CommandPermission([Discord.Permissions.FLAGS.MANAGE_CHANNELS]));

    /**
     * SUB COMMANDS
     */

    const list_command = new SimpleCommand(async message => {
        const s_channels = await manager.getChannels(message.guild);

        if (s_channels.length === 0) {
            return new Translation("alert.empty", "Hehe, nothing here lol. Time to add some.");
        }

        /** @type {Map<any, Channel>} */
        const sorted_by_channels = new Map;
        for (const s_channel of s_channels)
            sorted_by_channels.set(s_channel.channel, [...sorted_by_channels.get(s_channel.channel) || [], s_channel]);

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        for (const [g_channel, s_channels] of sorted_by_channels) {
            let str = "";
            for (const s_channel of s_channels) str += s_channel.getURL(true) + "\n";

            embed.addField("#" + g_channel.name, str);
        }

        await message.channel.send({ embed });
    });

    alertCommand.registerSubCommand("list", list_command)
        .setHelp(new HelpContent().setUsage("", "list all active streaming alerts"));

    alertCommand.registerSubCommand("remove", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content: url }) => {
            const g_channel = message.mentions.channels.first() || message.channel;

            if (!/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/.test(url)) {
                return new Translation("alert.invalid_url", "`page url` should be a vaid url! Instead I got a lousy \"{{url}}\"", { url });
            }

            const config = await manager.parseConfig(g_channel, url);
            if (!config) {
                return new Translation("alert.unknown_service", "MMMMMMMMMMMMHHHHHHHH I don't know this website :c");
            }
            if (!config.name) {
                return new Translation("alert.page_missing", "You should also give me your channel page in the url instead of just the site!");
            }
            if (!config.userId || !config._id) {
                return new Translation("alert.not_subscribed", "I was not subscribed to this streamer.");
            }

            await manager.removeChannel(config);

            return new Translation("alert.remove_success", "Stopped alerting for {{name}}", {
                name: config.name,
            });
        }))
        .setHelp(new HelpContent().setUsage("<page url>", "unsubscribe Trixie from a Picarto channel"));

    alertCommand.registerSubCommand("compact", new SimpleCommand(async message => {
        if (await manager.isCompact(message.guild)) {
            await manager.unsetCompact(message.guild);
            return new Translation("alert.compact_off", "Compact online announcements are now turned off.");
        } else {
            await manager.setCompact(message.guild);
            return new Translation("alert.compact_on", "Compact online announcements are now turned on.");
        }
    }))
        .setHelp(new HelpContent().setUsage("", "toggle compact online announcements"));

    alertCommand.registerSubCommand("cleanup", new SimpleCommand(async message => {
        if (await manager.isCleanup(message.guild)) {
            await manager.unsetCleanup(message.guild);
            return new Translation("alert.cleanup_off", "Not deleting online announcements when going offline now.");
        } else {
            await manager.setCleanup(message.guild);
            return new Translation("alert.cleanup_on", "Cleaning up online announcements now.");
        }
    }))
        .setHelp(new HelpContent().setUsage("", "toggle cleaning up online announcements"));

    alertCommand.registerDefaultCommand(new OverloadCommand)
        .registerOverload("0", list_command)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const g_channel = message.mentions.channels.first() || message.channel;

            const url = content.replace(new RegExp(g_channel.toString(), "g"), "").trim();
            if (url === "") {
                return new Translation("alert.url_missing", "`page url` should be a vaid url! Instead I got nothing");
            }
            if (!/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/.test(url)) {
                return new Translation("alert.invalid_url", "`page url` should be a vaid url! Instead I got a lousy \"{{url}}\"", { url });
            }

            const config = await manager.parseConfig(g_channel, url);
            if (!config) {
                return new Translation("alert.unknown_service", "MMMMMMMMMMMMHHHHHHHH I don't know this website :c");
            }
            if (!config.name) {
                return new Translation("alert.page_missing", "You should also give me your channel page in the url instead of just the site!");
            }
            if (!config.userId) {
                return new Translation("alert.no_exist", "That user does not exist!");
            }
            if (config._id) {
                return new Translation("alert.already_subscribed", "This server is already subscribed to this streamer.");
            }

            await manager.addChannel(config);

            return new Translation("alert.success", "Will be alerting y'all there when {{name}} goes online!", {
                name: config.name,
            });
        }));

    alertCommand.registerSubCommandAlias("*", "add");
};
