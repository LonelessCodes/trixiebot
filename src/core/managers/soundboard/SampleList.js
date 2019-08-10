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

const { basicEmbed } = require("../../../util/util");
const Events = require("events");
const AudioManager = require("../AudioManager");
// eslint-disable-next-line no-unused-vars
const { PredefinedSample, UserSample, GuildSample } = require("./Sample");
// eslint-disable-next-line no-unused-vars
const { User, Guild, TextChannel, Message, MessageReaction, Permissions } = require("discord.js");

class SampleList extends Events {
    /**
     * @param {User} user
     * @param {Guild} guild
     * @param {Object} samples
     * @param {number} samples.total
     * @param {PredefinedSample[]} samples.predefined
     * @param {UserSample[]} samples.user
     * @param {GuildSample[]} samples.guild
     * @param {Object} max_slots
     * @param {number} max_slots.guild
     * @param {number} max_slots.user
     * @param {number} timeout
     */
    constructor(user, guild, samples, max_slots = { guild: 0, user: 0 }, timeout = 60000 * 2) {
        super();

        this.user = user;
        this.guild = guild;
        this.member = this.guild.member(this.user);
        this.samples = samples;
        this.max_slots = {
            guild: max_slots.guild,
            user: max_slots.user,
        };
        this.timeout = timeout;

        /** @type {Map<string, PredefinedSample|UserSample|GuildSample>} */
        this.map = new Map;
        this.ids = new Map;

        let i = 0;
        for (const sample of this.samples.predefined) {
            const emoji = SampleList.EMOJIS[i];
            this.map.set(emoji, sample);
            this.ids.set(sample.name, emoji);
            i++;
        }
        for (const sample of this.samples.guild) {
            if (i >= SampleList.EMOJIS.length) break;
            const emoji = SampleList.EMOJIS[i];
            if (!this.ids.has(sample.id)) {
                this.ids.set(sample.id, emoji);
                this.map.set(emoji, sample);
                i++;
            }
        }
        for (const sample of this.samples.user) {
            if (i >= SampleList.EMOJIS.length) break;
            const emoji = SampleList.EMOJIS[i];
            if (!this.ids.has(sample.id)) {
                this.ids.set(sample.id, emoji);
                this.map.set(emoji, sample);
                i++;
            }
        }
    }

    /**
     * Begins pagination on page 1 as a new Message in the provided TextChannel
     *
     * @param {TextChannel} channel
     */
    async display(channel) {
        this.initialize(await channel.send(this.renderEmbed()));
    }

    renderEmbed(withEmoji = true) {
        const samples = this.samples;

        const embed = basicEmbed("Available Samples", this.user);

        const prefix = this.guild.config.prefix;
        embed.setDescription(
            "Play a sample with `" + prefix + "sb <sample name>`. " +
            "View more info about a sample by typing `" + prefix + "sb info u <sample name>` for user samples and `" +
            prefix + "sb info s <sample name>` for server samples."
        );

        if (withEmoji) {
            if (samples.predefined.length > 0) embed.addField(
                "Predefined Samples",
                samples.predefined.map(s => this.ids.get(s.name) + " `" + s.name + "`").join(", ")
            );
            if (samples.guild.length > 0) embed.addField(
                "Server Samples",
                samples.guild.map(s => this.ids.get(s.id) + " `" + s.name + "`").join(", ") + "\nTaken Slots: " + samples.guild.length + " | All Slots: " + this.max_slots.guild
            );
            if (samples.user.length > 0) embed.addField(
                "User Samples",
                samples.user.map(s => this.ids.get(s.id) + " `" + s.name + "`").join(", ") + "\nTaken Slots: " + samples.user.length + " | All Slots: " + this.max_slots.user
            );
        } else {
            if (samples.predefined.length > 0) embed.addField(
                "Predefined Samples",
                samples.predefined.map(s => "`" + s.name + "`").join(", ")
            );
            if (samples.guild.length > 0) embed.addField(
                "Server Samples",
                samples.guild.map(s => "`" + s.name + "`").join(", ") + "\nTaken Slots: " + samples.guild.length + " | All Slots: " + this.max_slots.guild
            );
            if (samples.user.length > 0) embed.addField(
                "User Samples",
                samples.user.map(s => "`" + s.name + "`").join(", ") + "\nTaken Slots: " + samples.user.length + " | All Slots: " + this.max_slots.user
            );
        }

        return { embed };
    }

    /**
     * @param {Message} message
     * @param {number} page_num
     */
    async initialize(message) {
        this.pagination(message);
        for (const [, emoji] of this.ids) {
            await message.react(emoji).catch(() => { /* Do nothing */ });
        }
    }

    /**
     * @param {Message} message
     * @param {number} page_num
     */
    pagination(message) {
        const collector = message.createReactionCollector(
            (reaction, user) => {
                if (user.bot) return false;
                if (this.guild.me.voiceChannelID &&
                    this.guild.me.voiceChannelID !== this.guild.member(user).voiceChannelID) return false;
                return this.map.has(reaction.emoji.name);
            },
            { time: this.timeout, max: 1 }
        );

        collector.on("end", (collected, reason) => {
            if (reason === "time" || collected.size === 0) return this.end(message);

            this.handleMessageReactionAddAction(collected.first(), message);
        });
    }

    /**
     * @param {MessageReaction} reaction
     * @param {Message} message
     */
    async handleMessageReactionAddAction(reaction, message) {
        try {
            const audio = AudioManager.getGuild(this.guild);
            const connection = await audio.connect(this.member);
            await this.map.get(reaction.emoji.name).play(connection);
        } catch (_) { _; }

        try {
            if (message.channel.permissionsFor(this.guild.me).has(Permissions.FLAGS.MANAGE_MESSAGES))
                reaction.remove(this.user);
        } catch (_) { _; }

        this.pagination(message);
    }

    /**
     * @param {Message} message
     */
    async end(message) {
        await message.clearReactions().catch(() => { /* Do nothing */ });
        await message.edit(this.renderEmbed(false));
        this.emit("end", message);
    }
}

SampleList.EMOJIS = [
    "0⃣",
    "1⃣",
    "2⃣",
    "3⃣",
    "4⃣",
    "5⃣",
    "6⃣",
    "7⃣",
    "8⃣",
    "9⃣",
    "🔟",
    "#⃣",
    "🅰",
    "🆎",
    "🅱",
    "🆑",
    "🇦",
    "🇧",
    "🇨",
    "🇩",
    "🇪",
    "🇫",
    "❤",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "⚪",
    "⚫",
    "🔴",
    "🔵",
];

module.exports = SampleList;
