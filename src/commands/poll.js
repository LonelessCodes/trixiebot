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

const LocaleManager = require("../core/managers/LocaleManager");
const { parseHumanTime, toHumanTime } = require("../util/time");
const { escapeRegExp } = require("../util/string");
const { progressBar } = require("../util/util");
const CONST = require("../const");
const Discord = require("discord.js");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");

class Poll {
    // eslint-disable-next-line valid-jsdoc
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
            channelId: this.channel.id,
        }))) {
            // all the way up in the message handler we checked if DB includes
            // this channel already.So now we can go the efficient insert way
            await this.db.insertOne({
                guildId: this.guild.id,
                channelId: this.channel.id,
                creatorId: this.creator.id,
                votes: this.votes,
                users: Array.from(this.users.keys()), // get all ids from the Collection
                endDate: this.endDate,
            });
        }

        const timeLeft = this.endDate.getTime() - Date.now();
        if (timeLeft > 0) {
            await this.channel.awaitMessages(message => {
                for (const option of this.options)
                    if (new RegExp(`^${escapeRegExp(option)}`, "i").test(message.content))
                        return this.vote(message.member, option);

                return false;
            }, { time: timeLeft });
        }

        await this.db.deleteOne({
            guildId: this.guild.id,
            channelId: this.channel.id,
        });
        Poll.polls.splice(Poll.polls.indexOf(this));

        const total = this.users.size; // get num of votes

        if (total === 0) {
            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setDescription(await this.channel.translate("But no one voted :c"));
            await this.channel.sendTranslated("{{user}} Poll ended!", {
                user: this.creator.toString(),
            }, { embed });
            return;
        }

        const result = this.options
            .map(option => ({
                text: option,
                votes: this.votes[option],
            }))
            .sort((a, b) => b.votes - a.votes);

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        for (const vote of result) embed.addField(vote.text, progressBar(vote.votes / total, 20, "█", "░"));
        embed.setFooter(LocaleManager
            .locale(await this.channel.locale())
            .translate("{{votesCount}} vote")
            .ifPlural("{{votesCount}} votes")
            .format({ votesCount: total })
            .fetch(total));

        await this.channel.sendTranslated("{{user}} Poll ended!", {
            user: this.creator.toString(),
        }, { embed });
    }

    vote(member, option) {
        if (this.users.has(member.id)) return;

        this.users.set(member.id, member);
        this.votes[option]++;

        this.db.updateOne({
            guildId: this.guild.id,
            channelId: this.channel.id,
        }, {
            $set: {
                votes: this.votes,
                users: Array.from(this.users.keys()),
            },
        });

        return true;
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

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("poll");

    const polls = await database.find({}).toArray();
    for (const poll of polls) {
        const guild = client.guilds.get(poll.guildId);
        if (!guild) {
            await database.deleteOne({ _id: poll._id });
            continue;
        }

        const channel = guild.channels.get(poll.channelId);
        if (!channel) {
            await database.deleteOne({ _id: poll._id });
            continue;
        }

        const creator = await guild.fetchMember(poll.creatorId) || {
            id: poll.creatorId,
            toString() { return `<@${poll.creatorId}>`; },
        };

        const endDate = poll.endDate;

        const votes = poll.votes;

        const users = new Discord.Collection(await Promise.all(poll.users.map(async userId =>
            [userId, await guild.fetchMember(userId)]
        )));

        const poll_object = new Poll(
            database,
            guild,
            channel,
            creator,
            endDate,
            votes,
            users
        );
        Poll.add(poll_object);
    }

    cr.registerCommand("poll", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            if (await database.findOne({ guildId: message.guild.id, channelId: message.channel.id })) {
                await message.channel.sendTranslated("Hey hey hey. There's already a poll running in this channel. Only one poll in a channel at a time allowed");
                return;
            }

            let duration_string = (content.match(/([\d.]+(d|h|m|s|ms)\s*)+/g) || [])[0];
            if (!duration_string) {
                await message.channel.send(await message.channel.translate("`duration` must be formated as in the example."));
                return;
            }

            const duration = parseHumanTime(duration_string);
            if (duration < 60000 || duration > 1000 * 3600 * 24 * 3) {
                await message.channel.send(await message.channel.translate("`duration` should be at least 1m and max 3d"));
                return;
            }

            content = content.substr(duration_string.length);
            if (content === "") {
                await message.channel.send(await message.channel.translate("To create a poll you must give at least two options to choose from."));
                return;
            }

            const options = content.split(/,\s*/g).sort((a, b) => b.length - a.length); // longest to shortest
            if (options.length < 2) {
                await message.channel.send(await message.channel.translate("To create a poll you must give at least two options to choose from."));
                return;
            }

            const users = new Discord.Collection;
            const votes = {};
            for (const option of options) votes[option] = 0;

            const poll = new Poll(
                database,
                message.guild,
                message.channel,
                message.member,
                new Date(Date.now() + duration),
                votes,
                users
            );
            Poll.add(poll);

            await message.channel.send(await message.channel.translate("@here Poll is starting! {{timeLeft}} left to vote", {
                timeLeft: `**${toHumanTime(duration)}**`,
            }) + "\n" + await message.channel.translate("You vote by simply posting {{options}} in this channel", {
                options: `\`${options.slice(0, -1).join("`, `")}\` or \`${options.slice(-1)[0]}\``,
            }));
        }))
        .setHelp(new HelpContent()
            .setDescription("Create a poll that users can vote on")
            .setUsage("<duration> <option 1>, <option 2>, ..., <option n>")
            .addParameter("duration", "Duration of the poll. E.g.: `1h 20m 10s`, `0d 100m 70s` or `0.5h` are valid inputs")
            .addParameter("option", "a comma seperated list of options to vote for"))
        .setCategory(Category.MISC);
};
