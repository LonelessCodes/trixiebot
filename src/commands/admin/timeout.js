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

/* eslint-disable require-atomic-updates */
const { userToString, fetchMember } = require("../../util/util");
const { toHumanTime, parseHumanTime } = require("../../util/time");
const { splitArgs } = require("../../util/string");
const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const CommandScope = require("../../util/commands/CommandScope");
const Category = require("../../util/commands/Category");
const MessageMentions = require("../../util/discord/MessageMentions").default;

/** @type {{ [id: string]: { last: boolean; time: Date; message: Discord.Message } }} */
const timeout_notices = {};

const Translation = require("../../modules/i18n/Translation").default;
const TranslationPlural = require("../../modules/i18n/TranslationPlural").default;
const ListFormat = require("../../modules/i18n/ListFormat").default;

// eslint-disable-next-line no-warning-comments
// TODO: proper redo of the timeout commands and system

module.exports = function install(cr, { db }) {
    const database = db.collection("timeout");
    database.createIndex("expiresAt", { expireAfterSeconds: 0 });
    const database_messages = db.collection("timeout_messages");
    database_messages.createIndex("timeoutEnd", { expireAfterSeconds: 24 * 3600 });

    const permission = new CommandPermission([Discord.Permissions.FLAGS.MANAGE_MESSAGES]);

    cr.registerProcessedHandler(new CommandScope(CommandScope.FLAGS.GUILD), true, async ({ message, ctx }) => {
        if (!timeout_notices[message.channel.id])
            timeout_notices[message.channel.id] = {};

        const timeout_entry = await database.findOne({ guildId: message.guild.id, memberId: message.author.id });
        if (timeout_entry) {
            const timeleft = timeout_entry.expiresAt.getTime() - Date.now();
            if (timeleft > 0) {
                const content = message.content;
                message.delete().catch(() => { /* Do nothing */ });

                const expiresIn = toHumanTime(timeleft);

                const timeoutNotice = new Translation(
                    "timeout.timeouted",
                    "{{userMention}} You've been timeouted from writing in this server. Your timeout is over in {{timeLeft}}",
                    {
                        userMention: message.member.toString(),
                        timeLeft: `__**${expiresIn}**__`,
                    }
                );

                if (timeout_notices[message.channel.id].time &&
                    (timeout_notices[message.channel.id].last ||
                        timeout_notices[message.channel.id].time.getTime() + (60000 * 10) > Date.now())) {
                    timeout_notices[message.channel.id].time = new Date;
                    timeout_notices[message.channel.id].message.delete();
                    timeout_notices[message.channel.id].message =
                        await ctx.send(timeoutNotice);
                    return;
                }

                const notice = await ctx.send(timeoutNotice);

                await database_messages.insertOne({
                    guildId: message.guild.id,
                    memberId: message.author.id,
                    message: content,
                    timeoutEnd: timeout_entry.expiresAt,
                });

                timeout_notices[message.channel.id] = {
                    last: true,
                    time: new Date,
                    message: notice,
                };

                return;
            } else if (timeleft <= 0) {
                // mongodb has some problems with syncing the expiresAt index properly.
                // It can take up to a minute for it to remove the document, so we just
                // remove it manually if it hasn't been cleared already
                await database.deleteOne({ _id: timeout_entry._id }).catch(() => { /* Do nothing */ });
            }
        }

        timeout_notices[message.channel.id].last = false;
    });

    const timeoutCommand = cr.registerCommand("timeout", new TreeCommand)
        .setHelp(new HelpContent()
            .setUsage("<time> <user mention 1> <user mention 2> ...")
            .addParameter("time", "timeout length. E.g.: `1h 20m 10s`, `0d 100m 70s` or `0.5h` are valid inputs")
            .addParameter("user mention", "user to timeout. Multiple users possible"))
        .setCategory(Category.MODERATION)
        .setPermissions(permission);

    timeoutCommand.registerSubCommand("remove", new SimpleCommand(async ({ message, mentions, ctx }) => {
        const members = mentions.members.array();

        if (members.length === 0) {
            return new Translation("timeouts.found_no_mentions", "Found none of the mentioned users here");
        }

        for (const member of members) {
            await database_messages.updateMany({
                guildId: message.guild.id,
                memberId: member.id,
            }, {
                $set: {
                    timeoutEnd: new Date,
                },
            });
        }

        const promises = members.map(member => database.deleteOne({ guildId: member.guild.id, memberId: member.id }));

        await ctx.send(new Translation("timeout.remove_success", "Removed timeouts for {{user}} successfully. Get dirty~", {
            users: new ListFormat(members.map(member => userToString(member))),
        }));

        await Promise.all(promises);
    }))
        .setHelp(new HelpContent()
            .setUsage("<user mention 1> <user mention 2> ...")
            .addParameter("user mention", "user to remove timeout from. Multiple users possible"));

    timeoutCommand.registerSubCommand("clear", new SimpleCommand(async message => {
        const timeouts = await database.find({ guildId: message.guild.id }).toArray();

        for (const timeout of timeouts) {
            await database_messages.updateMany({
                guildId: message.guild.id,
                memberId: timeout.memberId,
            }, {
                $set: {
                    timeoutEnd: new Date,
                },
            });
        }

        await database.deleteMany({ guildId: message.guild.id });

        return new Translation("timeout.remove_all_success", "Removed all timeouts successfully");
    }))
        .setHelp(new HelpContent().setUsage("", "remove all timeouts"));

    timeoutCommand.registerSubCommand("list", new SimpleCommand(async message => {
        let longestName = 0;
        let longestString = 0;

        const timeouts = await database.find({ guildId: message.guild.id }).toArray();
        const docs = await Promise.all(timeouts.map(async doc => {
            doc.member = await fetchMember(message.guild, doc.memberId);
            return doc;
        })).then(arr => arr.filter(doc => !!doc.member).map(doc => {
            if (longestName < userToString(doc.member).length) {
                longestName = userToString(doc.member).length;
            }
            doc.string = toHumanTime(doc.expiresAt.getTime() - Date.now());
            if (longestString < doc.string.length) {
                longestString = doc.string.length;
            }
            return doc;
        }));

        let str = "```";
        for (const doc of docs) {
            str += "\n";
            str += userToString(doc.member);
            str += new Array(longestName - userToString(doc.member).length).fill(" ").join("");
            str += " | ";
            str += doc.string;
        }
        str += "\n```";
        await message.channel.send(str);
    }))
        .setHelp(new HelpContent()
            .setUsage("", "list all timeouts present at the moment"));

    timeoutCommand.registerDefaultCommand(new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content: msg, ctx }) => {
            const args = splitArgs(msg, 2);
            if (args.length < 2) {
                return new Translation("timeout.at_least", "At least two arguments are required: duration and @user");
            }

            let members = new MessageMentions(args[1], message).members;

            if (members.has(message.member.id)) {
                return new Translation("timeout.not_yourself", "You cannot timeout yourself, dummy!");
            }

            if (members.has(message.client.user.id)) {
                return new Translation("timeout.not_trixie", "You cannot timeout TrixieBot! I own you.");
            }

            members = members.array();

            for (const member of members) {
                if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) {
                    return new Translation(
                        "timeout.not_other_moderators", "You cannot timeout other moderators or admins. That's just rood"
                    );
                }
            }

            const timestr = args[0].trim();

            const ms = parseHumanTime(timestr);
            if (ms < 10000 || ms > 1000 * 3600 * 24 * 3) {
                return new Translation(
                    "timeout.out_range", "Timeout length should be at least 10 seconds long and shorter than 3 days"
                );
            }

            const expiresAt = new Date(Date.now() + ms);

            // update message deletion if there
            for (const member of members) {
                await database_messages.updateMany({
                    guildId: message.guild.id,
                    memberId: member.id,
                }, {
                    $set: {
                        timeoutEnd: expiresAt,
                    },
                });
            }

            const promises = members.map(member =>
                database.updateOne({ guildId: member.guild.id, memberId: member.id }, { $set: { expiresAt } }, { upsert: true })
            );

            await ctx.send(new TranslationPlural(
                "timeout.success",
                ["{{users}} is now timeouted for the next {{timeLeft}}", "{{users}} are now timeouted for the next {{timeLeft}}"],
                {
                    count: members.size,
                    users: new ListFormat(members.map(member => userToString(member))),
                    timeLeft: timestr,
                }
            ));

            await Promise.all(promises);
        }));
};
