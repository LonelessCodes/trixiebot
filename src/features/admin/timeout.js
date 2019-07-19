/* eslint-disable require-atomic-updates */
const { userToString } = require("../../modules/util");
const LocaleManager = require("../../logic/managers/LocaleManager");
const { toHumanTime, parseHumanTime } = require("../../modules/util/time");
const { splitArgs } = require("../../modules/util/string");
const Discord = require("discord.js");

const SimpleCommand = require("../../class/SimpleCommand");
const OverloadCommand = require("../../class/OverloadCommand");
const TreeCommand = require("../../class/TreeCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const CommandPermission = require("../../logic/commands/CommandPermission");
const Category = require("../../logic/commands/Category");
const MessageMentions = require("../../modules/MessageMentions");

/** @type {{ [id: string]: { last: boolean; time: Date; message: Discord.Message } }} */
const timeout_notices = new Object;

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("timeout");
    database.createIndex("expiresAt", { expireAfterSeconds: 0 });
    const database_messages = db.collection("timeout_messages");
    database_messages.createIndex("timeoutEnd", { expireAfterSeconds: 24 * 3600 });

    const permission = new CommandPermission([Discord.Permissions.FLAGS.MANAGE_MESSAGES]);

    const timeoutCommand = cr.registerCommand("timeout", new class extends TreeCommand {
        async beforeProcessCall(message) {
            if (!timeout_notices[message.channel.id])
                timeout_notices[message.channel.id] = {};

            const timeout_entry = await database.findOne({ guildId: message.guild.id, memberId: message.author.id });
            if (timeout_entry) {
                const timeleft = timeout_entry.expiresAt.getTime() - Date.now();
                if (timeleft > 0) {
                    const content = message.content;
                    message.delete().catch(() => { });

                    const expiresIn = toHumanTime(timeleft);

                    const timeoutNotice = await message.channel.translate("{{userMention}} You've been timeouted from writing in this server. Your timeout is over in {{timeLeft}}", {
                        userMention: message.member.toString(),
                        timeLeft: `__**${expiresIn}**__`
                    });

                    if (timeout_notices[message.channel.id].time &&
                        (timeout_notices[message.channel.id].last ||
                            timeout_notices[message.channel.id].time.getTime() + 60000 * 10 > Date.now())) {

                        timeout_notices[message.channel.id].time = new Date;
                        timeout_notices[message.channel.id].message.delete();
                        timeout_notices[message.channel.id].message =
                            await message.channel.send(timeoutNotice);
                        return;
                    }

                    const notice = await message.channel.send(timeoutNotice);

                    await database_messages.insertOne({
                        guildId: message.guild.id,
                        memberId: message.author.id,
                        message: content,
                        timeoutEnd: timeout_entry.expiresAt
                    });

                    timeout_notices[message.channel.id] = {
                        last: true,
                        time: new Date,
                        message: notice,
                    };

                    return;
                } else if (timeleft <= 0) {
                    // mongodb has some problems with syncing the expiresAt index properly.
                    // It can take up to a minute for it to remove the document, so we just remove it manually if it hasn't been cleared already
                    await database.deleteOne({ _id: timeout_entry._id }).catch(() => { });
                }
            }

            timeout_notices[message.channel.id].last = false;
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<time> <user mention 1> <user mention 2> ...")
            .addParameter("time", "timeout length. E.g.: `1h 20m 10s`, `0d 100m 70s` or `0.5h` are valid inputs")
            .addParameter("user mention", "user to timeout. Multiple users possible"))
        .setCategory(Category.MODERATION)
        .setPermissions(permission)
        .setIgnore(false);

    timeoutCommand.registerSubCommand("remove", new SimpleCommand(async (message, content) => {
        const members = new MessageMentions(content, message.guild).members.array();

        for (const member of members) {
            await database_messages.updateMany({
                guildId: message.guild.id,
                memberId: member.id
            }, {
                $set: {
                    timeoutEnd: new Date
                }
            });
        }

        const promises = members.map(member => database.deleteOne({ guildId: member.guild.id, memberId: member.id }));

        await message.channel.sendTranslated("Removed timeouts for {{user}} successfully. Get dirty~", {
            users: members.map(member => userToString(member)).join(" ")
        });

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
                memberId: timeout.memberId
            }, {
                $set: {
                    timeoutEnd: new Date
                }
            });
        }

        await database.deleteMany({ guildId: message.guild.id });

        await message.channel.sendTranslated("Removed all timeouts successfully");
    }))
        .setHelp(new HelpContent().setUsage("", "remove all timeouts"));

    timeoutCommand.registerSubCommand("list", new SimpleCommand(async message => {
        let longestName = 0;
        let longestString = 0;
        const docs = (await database.find({ guildId: message.guild.id }).toArray()).map(doc => {
            doc.member = message.guild.members.has(doc.memberId) ?
                message.guild.members.get(doc.memberId) :
                null;
            if (longestName < userToString(doc.member).length) {
                longestName = userToString(doc.member).length;
            }
            doc.string = toHumanTime(doc.expiresAt.getTime() - Date.now());
            if (longestString < doc.string.length) {
                longestString = doc.string.length;
            }
            return doc;
        }).filter(doc => !!doc.member);
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
        .registerOverload("1+", new SimpleCommand(async (message, msg) => {
            const args = splitArgs(msg, 2);
            if (args.length < 2) {
                await message.channel.sendTranslated("At least two arguments are required: duration and @user");
                return;
            }

            let members = new MessageMentions(args[1], message.guild).members;

            if (members.has(message.member.id)) {
                await message.channel.sendTranslated("You cannot timeout yourself, dummy!");
                return;
            }

            if (members.has(message.client.user.id)) {
                await message.channel.sendTranslated("You cannot timeout TrixieBot! I own you.");
                return;
            }

            members = members.array();

            for (const member of members) {
                if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) {
                    await message.channel.sendTranslated("You cannot timeout other moderators or admins. That's just rood");
                    return;
                }
            }

            const timestr = args[0].trim();

            const ms = parseHumanTime(timestr);
            if (ms < 10000 || ms > 1000 * 3600 * 24 * 3) {
                await message.channel.sendTranslated("Timeout length should be at least 10 seconds long and shorter than 3 days");
                return;
            }

            const expiresAt = new Date(Date.now() + ms);

            // update message deletion if there
            for (const member of members) {
                await database_messages.updateMany({
                    guildId: message.guild.id,
                    memberId: member.id
                }, {
                    $set: {
                        timeoutEnd: expiresAt
                    }
                });
            }

            const promises = members.map(member => database.updateOne({ guildId: member.guild.id, memberId: member.id }, { $set: { expiresAt } }, { upsert: true }));

            await message.channel.send(LocaleManager.format(LocaleManager
                .locale(await message.channel.locale())
                .translate("{{users}} is now timeouted for the next {{timeLeft}}")
                .ifPlural("{{users}} are now timeouted for the next {{timeLeft}}")
                .fetch(members.size), {
                users: members.map(member => userToString(member)).join(" "),
                timeLeft: timestr
            }));

            await Promise.all(promises);
        }));
};