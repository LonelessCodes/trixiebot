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

import { basicEmbed } from "../../../util/util";
import { doNothing } from "../../../util/promises";
import { EventEmitter } from "events";
import AudioManager from "../AudioManager";
import { PredefinedSample, UserSample, GuildSample, Sample } from "./Sample";
import Discord from "discord.js";

interface SampleListSamples {
    total: number;
    predefined: PredefinedSample[];
    user: UserSample[];
    guild: GuildSample[];
}

interface SampleListMaxSlots {
    guild: number;
    user: number;
}

export interface SampleListOptions {
    prefix: string;
    samples: SampleListSamples;
    max_slots?: SampleListMaxSlots;
    timeout?: number;
}

export default class SampleList extends EventEmitter {
    user: Discord.User;
    guild: Discord.Guild;
    prefix: string;
    samples: SampleListSamples;
    max_slots: SampleListMaxSlots;
    timeout: number;

    get member() {
        return this.guild.member(this.user);
    }

    map: Map<string, PredefinedSample | UserSample | GuildSample> = new Map();
    ids = new Map();

    constructor(user: Discord.User, guild: Discord.Guild, opts: SampleListOptions) {
        super();

        this.user = user;
        this.guild = guild;
        this.prefix = opts.prefix;
        this.samples = opts.samples;
        this.max_slots = {
            guild: opts.max_slots ? opts.max_slots.guild : 0,
            user: opts.max_slots ? opts.max_slots.user : 0,
        };
        this.timeout = typeof opts.timeout === "undefined" ? 60000 * 2 : opts.timeout;

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
     * @param {Discord.TextChannel} channel
     */
    async display(channel: Discord.TextChannel) {
        const msg = await channel.send(this.renderEmbed());
        this.initialize(msg).catch(() => {
            /* Do nothing */
        });
        return msg;
    }

    private renderEmbed(withEmoji: boolean = true) {
        const samples = this.samples;

        const embed = basicEmbed("Available Samples", this.user);

        const prefix = this.prefix;
        embed.setDescription(
            "Play a sample with `" +
                prefix +
                "sb <sample name>`. " +
                "View more info about a sample by typing `" +
                prefix +
                "sb info u <sample name>` for user samples and `" +
                prefix +
                "sb info s <sample name>` for server samples."
        );

        if (withEmoji) {
            if (samples.predefined.length > 0)
                embed.addField(
                    "Predefined Samples",
                    samples.predefined.map(s => this.ids.get(s.name) + " `" + s.name + "`").join(", ")
                );
            if (samples.guild.length > 0)
                embed.addField(
                    "Server Samples",
                    samples.guild.map(s => this.ids.get(s.id) + " `" + s.name + "`").join(", ") +
                        "\nTaken Slots: " +
                        samples.guild.length +
                        " | All Slots: " +
                        this.max_slots.guild
                );
            if (samples.user.length > 0)
                embed.addField(
                    "User Samples",
                    samples.user.map(s => this.ids.get(s.id) + " `" + s.name + "`").join(", ") +
                        "\nTaken Slots: " +
                        samples.user.length +
                        " | All Slots: " +
                        this.max_slots.user
                );
        } else {
            if (samples.predefined.length > 0)
                embed.addField("Predefined Samples", samples.predefined.map(s => "`" + s.name + "`").join(", "));
            if (samples.guild.length > 0)
                embed.addField(
                    "Server Samples",
                    samples.guild.map(s => "`" + s.name + "`").join(", ") +
                        "\nTaken Slots: " +
                        samples.guild.length +
                        " | All Slots: " +
                        this.max_slots.guild
                );
            if (samples.user.length > 0)
                embed.addField(
                    "User Samples",
                    samples.user.map(s => "`" + s.name + "`").join(", ") +
                        "\nTaken Slots: " +
                        samples.user.length +
                        " | All Slots: " +
                        this.max_slots.user
                );
        }

        return { embed };
    }

    async initialize(message: Discord.Message) {
        this.pagination(message);
        for (const [, emoji] of this.ids) {
            await message.react(emoji).catch(doNothing);
        }
    }

    pagination(message: Discord.Message) {
        const collector = message.createReactionCollector(
            (reaction, user) => {
                if (user.bot) return false;
                const member = this.guild.member(user);
                if (!member) return false;
                if (this.guild.me?.voice.channelID && this.guild.me.voice.channelID !== member.voice.channelID) return false;
                return this.map.has(reaction.emoji.name);
            },
            { time: this.timeout, max: 1 }
        );

        collector.on("end", (collected, reason) => {
            if (reason === "time" || collected.size === 0) return this.end(message);

            this.handleMessageReactionAddAction(collected.first()!, message);
        });
    }

    private handleMessageReactionAddAction(reaction: Discord.MessageReaction, message: Discord.Message) {
        const sample = this.map.get(reaction.emoji.name);
        if (sample) this.playSample(sample).catch(doNothing);

        const channel = message.channel as Discord.TextChannel;
        if (channel.permissionsFor(this.guild.me!)?.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
            reaction.users.remove(this.user).catch(doNothing);

        this.pagination(message);
    }

    private async playSample(sample: Sample) {
        if (!this.member) return;
        try {
            const audio = AudioManager.getGuild(this.guild);
            const connection = await audio.connect(this.member);
            await sample.play(connection);
        } catch {
            /* Do nothing */
        }
    }

    async end(message: Discord.Message) {
        await message.reactions.removeAll().catch(doNothing);
        await message.edit(this.renderEmbed(false));
        this.emit("end", message);
    }

    static EMOJIS = [
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
}
