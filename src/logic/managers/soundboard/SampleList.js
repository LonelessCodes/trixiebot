const { userToString } = require("../../../modules/util");
const CONST = require("../../../const");
const Events = require("events");
const AudioManager = require("../AudioManager");
// eslint-disable-next-line no-unused-vars
const { PredefinedSample, UserSample, GuildSample } = require("./Sample");
// eslint-disable-next-line no-unused-vars
const { User, Guild, TextChannel, Message, MessageReaction, RichEmbed } = require("discord.js");

class SampleList extends Events {
    /**
     * 
     * @param {User} user 
     * @param {Guild} guild 
     * @param {{
        total: number;
        predefined: PredefinedSample[];
        user: UserSample[];
        guild: GuildSample[];
        }} samples
     * @param {number} max_slots 
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
            const emoji = SampleList.EMOJIS[i];
            if (!this.ids.has(sample.id)) {
                this.ids.set(sample.id, emoji);
                this.map.set(emoji, sample);
                i++;
            }
        }
        for (const sample of this.samples.user) {
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

        const embed = new RichEmbed().setColor(CONST.COLOR.PRIMARY);

        embed.setAuthor(userToString(this.user, true) + " | Available Samples", this.user.avatarURL);

        embed.setDescription("Play a sample with `" + this.guild.config.prefix + "sb <sample name>`. View more info about a sample by typing `" + this.guild.config.prefix + "sb info u <sample name>` for user samples and `" + this.guild.config.prefix + "sb info s <sample name>` for server samples.");

        if (withEmoji) {
            if (samples.predefined.length > 0) embed.addField("Predefined Samples", samples.predefined.map(s => this.ids.get(s.name) + " `" + s.name + "`").join(", "));
            if (samples.guild.length > 0) embed.addField("Server Samples", samples.guild.map(s => this.ids.get(s.id) + " `" + s.name + "`").join(", ") + "\n" + "Taken Slots: " + samples.guild.length + " | All Slots: " + this.max_slots.guild);
            if (samples.user.length > 0) embed.addField("User Samples", samples.user.map(s => this.ids.get(s.id) + " `" + s.name + "`").join(", ") + "\n" + "Taken Slots: " + samples.user.length + " | All Slots: " + this.max_slots.user);
        } else {
            if (samples.predefined.length > 0) embed.addField("Predefined Samples", samples.predefined.map(s => "`" + s.name + "`").join(", "));
            if (samples.guild.length > 0) embed.addField("Server Samples", samples.guild.map(s => "`" + s.name + "`").join(", ") + "\n" + "Taken Slots: " + samples.guild.length + " | All Slots: " + this.max_slots.guild);
            if (samples.user.length > 0) embed.addField("User Samples", samples.user.map(s => "`" + s.name + "`").join(", ") + "\n" + "Taken Slots: " + samples.user.length + " | All Slots: " + this.max_slots.user);
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
            await message.react(emoji).catch(() => { });
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
                if (this.guild.me.voiceChannelID && this.guild.me.voiceChannelID !== this.guild.member(user).voiceChannelID) return false;
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
            reaction.remove(this.user);
        } catch (_) { _; }

        this.pagination(message);
    }

    /**
     * @param {Message} message 
     */
    async end(message) {
        await message.clearReactions().catch(() => { });
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
    "❤",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "♠️",
    "♥️",
    "♦️",
    "♣️"
];

module.exports = SampleList;