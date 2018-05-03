const log = require("../modules/log");
const { parseHumanTime, toHumanTime } = require("../modules/util");
const Command = require("../class/Command");
const Discord = require("discord.js");

function progressBar(v, a, b) {
    const length = 20;
    const str = new Array(length);
    str.fill(a);
    str.fill(b, Math.round(v * length));
    return `${str.join("")} ${(v * 100).toFixed(1)}%`;
}

class Poll {
    /**
     * A new Poll handling all the functionality of a trixie poll
     * @param {Discord.Guild} guild 
     * @param {Discord.TextChannel} channel 
     * @param {Discord.GuildMember} creator 
     * @param {Date} endDate 
     * @param {{ [x: string]: number; }} votes 
     * @param {Discord.Collection<any, Discord.GuildMember>} users 
     */
    constructor(db, guild, channel, creator, endDate, votes, users) {
        this.db = db;
        this.guild = guild;
        this.channel = channel;
        this.creator = creator;
        this.endDate = endDate;
        this.votes = votes;
        this.options = Object.keys(this.votes);
        this.users = users;

        this.init();
    }

    async init() {
        // insert into database
        if (!(await this.db.findOne({
            guildId: this.guild.id,
            channelId: this.channel.id
        }))) {
            // all the way up in the message handler we checked if DB includes 
            // this channel already.So now we can go the efficient insert way
            await this.db.insertOne({
                guildId: this.guild.id,
                channelId: this.channel.id,
                creatorId: this.creator.id,
                votes: this.votes,
                users: Array.from(this.users.keys()), // get all ids from the Collection
                endDate: this.endDate
            });
        }

        const timeLeft = this.endDate.getTime() - Date.now();
        if (timeLeft > 0) {
            await this.channel.awaitMessages(message => {
                for (let option of this.options) {
                    if (new RegExp(`^${option}`, "i").test(message.content)) {
                        return this.vote(message.member, option);
                    }
                }
                return false;
            }, { time: timeLeft });
        }

        await this.db.deleteOne({
            guildId: this.guild.id,
            channelId: this.channel.id
        });
        Poll.polls.splice(Poll.polls.indexOf(this));

        const total = this.users.size; // get num of votes

        if (total < 1) {
            const embed = new Discord.RichEmbed;
            embed.setColor(0x71B3E6);
            embed.setDescription("But no one voted :c");
            await this.channel.send(this.creator.toString() + " Poll ended!", { embed });
            log("Poll ended. No one voted");
            return;
        }

        const result = this.options
            .map(option => ({
                text: option,
                votes: this.votes[option]
            }))
            .sort((a, b) => b.votes - a.votes);

        const embed = new Discord.RichEmbed;
        embed.setColor(0x71B3E6);
        for (let vote of result) {
            embed.addField(vote.text, progressBar(vote.votes / total, "█", "░"));
        }
        embed.setFooter(`${total} ${total === 1 ? "vote" : "votes"}`);

        await this.channel.send(this.creator.toString() + " Poll ended!", { embed });
        log(`Poll ended. ${result[0].text} won with ${result[0].votes / total * 100}% votes`);
    }

    vote(member, option) {   
        if (!this.users.has(member.id)) {
            this.users.set(member.id, member);
            this.votes[option]++;

            const update = {};
            update["votes." + option] = this.votes[option];
            this.db.updateOne({
                guildId: this.guild.id,
                channelId: this.channel.id
            }, {
                $set: {
                    votes: this.votes,
                    users: [...this.users.keys()]
                }    
            });
            
            log(`User voted for ${option}`);
            return true;
        }
    }
}

/**
 * An array of currently active polls
 * @type {Poll[]}
 */
Poll.polls = [];

/**
 * @param {Poll} poll
 */
Poll.add = function add(poll) {
    if (poll instanceof Poll) Poll.polls.push(poll);
};

class PollCommand extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("poll");

        this.init();
    }

    async init() {
        const polls = await this.db.find({}).toArray();
        for (let poll of polls) {
            const guild = this.client.guilds.get(poll.guildId);
            if (!guild) {
                await this.db.deleteOne({ _id: poll._id });
                continue;
            }
    
            const channel = guild.channels.get(poll.channelId);
            if (!channel) {
                await this.db.deleteOne({ _id: poll._id });
                continue;
            }
    
            const creator = guild.members.get(poll.creatorId) || {
                id: poll.creatorId,
                toString() { return `<@${poll.creatorId}>`; }
            };
    
            const endDate = poll.endDate;
    
            const votes = poll.votes;
    
            const users = new Discord.Collection(poll.users.map(userId => {
                return [userId, guild.members.get(userId)];
            }));
    
            const poll_object = new Poll(
                this.db,
                guild,
                channel,
                creator,
                endDate,
                votes,
                users
            );
            Poll.add(poll_object);
        }
    }
    
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^poll\b/i.test(message.content)) return;

        /**
         * @type {string}
         */
        let msg = message.content.substr(5).trim();
        if (msg === "") {
            await message.channel.send(this.usage(message.prefix));
            log("Sent poll usage");
            return;
        }

        if (await this.db.findOne({ guildId: message.guild.id, channelId: message.channel.id })) {
            await message.channel.send("Hey hey hey. There's already a poll running in this channel. Only one poll in a channel at a time allowed");
            log("Gracefully aborted attempt to create poll. Poll already exists in this channel");
            return;
        }

        const duration_string = msg.match(/([\d.]+(d|h|m|s|ms)\s*)+/g)[0];
        if (!duration_string) {
            await message.channel.send("`duration` must be formated as in the example.\n\n" + this.usage(message.prefix));
            log("Gracefully aborted attempt to create poll. Duration parsing error");
            return;
        }

        const duration = parseHumanTime(duration_string);
        if (duration < 60000 || duration > 1000 * 3600 * 24 * 3) {
            await message.channel.send("`duration` should be at least 1m and max 3d\n\n" + this.usage(message.prefix));
            log("Gracefully aborted attempt to create poll. Duration out of range");
            return;
        }

        msg = msg.substr(duration_string.length);
        if (msg === "") {
            await message.channel.send("To create a poll you must give at least two options to choose from.\n\n" + this.usage(message.prefix));
            log("Gracefully aborted attempt to create poll. Options missing");
            return;
        }

        const options = msg.split(/,\s*/g).sort((a, b) => b.length - a.length); // longest to shortest
        if (options.length < 2) {
            await message.channel.send("To create a poll you must give at least two options to choose from.\n\n" + this.usage(message.prefix));
            log("Gracefully aborted attempt to create poll. Too little options");
            return;
        }

        const users = new Discord.Collection;
        const votes = {};
        for (let option of options) votes[option] = 0;

        const poll = new Poll(
            this.db,
            message.guild,
            message.channel,
            message.member,
            new Date(Date.now() + duration),
            votes,
            users
        );
        Poll.add(poll);

        await message.channel.send(`@here Poll is starting! **${toHumanTime(duration)}** left to vote\nYou vote by simply posting \`${options.slice(0, -1).join("`, `")}\` or \`${options.slice(-1)[0]}\` in this channel`);
        log(`Poll started. ${duration}ms. ${options.join(", ")}`);
    }

    usage(prefix) {
        return `\`${prefix}poll <duration> <option 1>, <option 2>, ..., <option n>\`
\`duration\` - Duration of the poll. E.g.: \`1h 20m 10s\`, \`0d 100m 70s\` or \`0.5h\` are valid inputs
\`option\` - a comma seperated list of options to vote for`;
    }
}

module.exports = PollCommand;
