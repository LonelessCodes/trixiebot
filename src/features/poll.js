const log = require("../modules/log");
const { parseHumanTime, toHumanTime } = require("../modules/util");
const Command = require("../modules/Command");
const Discord = require("discord.js");

function progressBar(v, a, b) {
    const length = 20;
    const str = new Array(length);
    str.fill(a);
    str.fill(b, Math.round(v * length));
    return `${str.join("")} ${(v * 100).toFixed(1)}%`;
}

/**
 * @type {Object<string, Object<string, Array<string>>>}
 */
const polls = {};

const command = new Command(async function onmessage(message) {
    if (/^\!poll\b/i.test(message.content)) {
        /**
         * @type {string}
         */
        let msg = message.content.substr(6).trim();
        if (msg === "") {
            await message.channel.send(this.usage);
            log("Sent poll usage");
            return;
        }

        if (polls[message.guild.id] && polls[message.guild.id][message.channel.id]) {
            await message.channel.send("Hey hey hey. There's already a poll running in this channel. Only one poll in a channel at a time allowed");
            log("Gracefully aborted attempt to create poll. Poll already exists in this channel");
            return;
        }

        const duration_string = msg.match(/([\d.]+(d|h|m|s|ms)\s*)+/g)[0];
        if (!duration_string) {
            await message.channel.send("`duration` must be formated as in the example.\n\n" + this.usage);
            log("Gracefully aborted attempt to create poll. Duration parsing error");
            return;
        }

        const duration = parseHumanTime(duration_string);
        if (duration < 60000 || duration > 1000 * 3600 * 24 * 3) {
            await message.channel.send("`duration` should be at least 1m and max 3d\n\n" + this.usage);
            log("Gracefully aborted attempt to create poll. Duration out of range");
            return;
        }

        msg = msg.substr(duration_string.length);
        if (msg === "") {
            await message.channel.send("To create a poll you must give at least two options to choose from.\n\n" + this.usage);
            log("Gracefully aborted attempt to create poll. Options missing");
            return;
        }

        const options = msg.split(/,\s*/g).sort((a, b) => b.length - a.length); // longest to shortest
        if (options.length < 2) {
            await message.channel.send("To create a poll you must give at least two options to choose from.\n\n" + this.usage);
            log("Gracefully aborted attempt to create poll. Too little options");
            return;
        }

        if (!polls[message.guild.id]) polls[message.guild.id] = {};
        polls[message.guild.id][message.channel.id] = options;

        await message.channel.send(`@here Poll is starting! **${toHumanTime(duration)}** left to vote\nYou vote by simply posting \`${options.slice(0, -1).join("`, `")}\` or \`${options.slice(-1)[0]}\` in this channel`);
        log(`Poll started. ${duration}ms. ${options.join(", ")}`);

        const users = [];
        const votes = {};
        for (let option of options) votes[option] = 0;

        const total = (await message.channel.awaitMessages(message => {
            for (let option of options) {
                if (new RegExp(`^${option}`, "i").test(message.content) &&
                    !users.includes(message.member.id)) {
                    users.push(message.member.id);
                    votes[option]++;
                    log(`User voted for ${option}`);
                    return true;
                }
            }
            return false;
        }, { time: duration })).size;

        delete polls[message.guild.id][message.channel.id];

        if (total < 1) {
            const embed = new Discord.RichEmbed;
            embed.setColor(0x71B3E6);
            embed.setDescription("But no one voted :c");
            await message.channel.send(message.member.toString() + " Poll ended!", { embed });
            log("Poll ended. No one voted");
            return;
        }

        const result = Object.keys(votes)
            .map(option => ({
                text: option,
                votes: votes[option]
            }))
            .sort((a, b) => b.votes - a.votes);

        const embed = new Discord.RichEmbed;
        embed.setColor(0x71B3E6);
        for (let vote of result) {
            embed.addField(vote.text, progressBar(vote.votes / total, "█", "░"));
        }
        embed.setFooter(`${total} ${total === 1 ? "vote" : "votes"}`);

        await message.channel.send(message.member.toString() + " Poll ended!", { embed });
        log(`Poll ended. ${result[0].text} won with ${result[0].votes / total * 100}% votes`);
    }
}, {
    ignore: true,
    usage: `\`!poll <duration> <option 1>, <option 2>, ..., <option n>\`
\`duration\` - Duration of the poll. E.g.: \`1h 20m 10s\`, \`0d 100m 70s\` or \`0.5h\` are valid inputs
\`option\` - a comma seperated list of options to vote for` });

module.exports = command;
