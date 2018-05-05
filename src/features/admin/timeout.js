const log = require("../../modules/log");
const locale = require("../../logic/Locale");
const { toHumanTime, parseHumanTime } = require("../../modules/util");
const Discord = require("discord.js");
const Command = require("../../class/Command");

/** @type {{ [id: string]: { last: boolean; time: Date; message: Discord.Message } }} */
const timeout_notices = new Object;

class TimeoutCommand extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("timeout");
        this.db.createIndex("expiresAt", { expireAfterSeconds: 0 });
        this.db_messages = db.collection("timeout_messages");
        this.db_messages.createIndex("timeoutEnd", { expireAfterSeconds: 24 * 3600 });
    }
    async onmessage(message) {
        if (!timeout_notices[message.channel.id])
            timeout_notices[message.channel.id] = {};

        const timeout_entry = await this.db.findOne({ guildId: message.guild.id, memberId: message.member.id });
        if (timeout_entry) {
            const timeleft = timeout_entry.expiresAt.getTime() - Date.now();
            if (timeleft > 0) {
                const content = message.content;
                await message.delete();

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

                await this.db_messages.insertOne({
                    guildId: message.guild.id,
                    memberId: message.member.id,
                    message: content,
                    timeoutEnd: timeout_entry.expiresAt
                });

                timeout_notices[message.channel.id] = {
                    last: true,
                    time: new Date,
                    message: notice,
                };

                log(`Sent timeout notice to user ${message.member.user.username} in guild ${message.guild.name} and saved their message before deletion`);
                return;
            } else if (timeleft <= 0) {
                // mongodb has some problems with syncing the expiresAt index properly.
                // It can take up to a minute for it to remove the document, so we just remove it manually if it hasn't been cleared already
                this.db.deleteOne({ _id: timeout_entry._id }).catch(() => { });
            }
        }

        timeout_notices[message.channel.id].last = false;

        if (!message.prefixUsed) return;

        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);

        if (/^timeout list\b/i.test(message.content)) {
            if (!permission) {
                await message.channel.sendTranslated("IDK what you're doing here. To use the timeout command you must have permissions to manage messages.");
                log("Gracefully aborted attempt to list timeouts without the required rights to do so");
                return;
            }

            let longestName = 0;
            let longestString = 0;
            const docs = (await this.db.find({ guildId: message.guild.id }).toArray()).map(doc => {
                doc.member = message.guild.members.has(doc.memberId) ?
                    message.guild.members.get(doc.memberId) :
                    null;
                if (longestName < doc.member.displayName.length) {
                    longestName = doc.member.displayName.length;
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
                str += doc.member.displayName;
                str += new Array(longestName - doc.member.displayName.length).fill(" ").join("");
                str += " | ";
                str += doc.string;
            }
            str += "\n```";
            await message.channel.send(str);
            log(`Sent list of timeouts in guild ${message.guild.name}`);
            return;
        }

        if (/^timeout clear\b/i.test(message.content)) {
            if (!permission) {
                await message.channel.sendTranslated("IDK what you're doing here. To use the timeout command you must have permissions to manage messages.");
                log("Gracefully aborted attempt to clear all timeouts without the required rights to do so");
                return;
            }

            const timeouts = await this.db.find({ guildId: message.guild.id }).toArray();

            for (const timeout of timeouts) {
                await this.db_messages.updateMany({
                    guildId: message.guild.id,
                    memberId: timeout.memberId
                }, {
                    $set: {
                        timeoutEnd: new Date
                    }
                });
            }

            await this.db.deleteMany({ guildId: message.guild.id });

            await message.channel.sendTranslated("Removed all timeouts successfully");
            log(`Removed all timeouts in guild ${message.guild.name}`);
            return;
        }

        if (/^timeout remove\b/i.test(message.content)) {
            if (!permission) {
                await message.channel.sendTranslated("IDK what you're doing here. To use the timeout command you must have permissions to manage messages.");
                log("Gracefully aborted attempt to remove timeout from user without the required rights to do so");
                return;
            }

            const members = message.mentions.members.array();

            for (const member of members) {
                await this.db_messages.updateMany({
                    guildId: message.guild.id,
                    memberId: member.id
                }, {
                    $set: {
                        timeoutEnd: new Date
                    }
                });
            }

            const promises = members.map(member => this.db.deleteOne({ guildId: member.guild.id, memberId: member.id }));

            await message.channel.sendTranslated("Removed timeouts for {{user}} successfully. Get dirty~", {
                users: members.map(member => member.displayName).join(" ")
            });

            await Promise.all(promises);
            log(`Removed timeout from users ${members.map(member => member.user.username).join(" ")} in guild ${message.guild.name}`);
            return;
        }

        if (/^timeout\b/i.test(message.content)) {
            if (!permission) {
                message.channel.sendTranslated("IDK what you're doing here. To use the timeout command you must have permissions to manage messages.");
                log("Gracefully aborted attempt to timeout user without the required rights to do so");
                return;
            }

            /**
             * @type {string}
             */
            let msg = message.content.substr(8);

            if (msg === "") {
                await message.channel.send(this.usage(message.prefix));
                log("Requested usage of timeout command");
                return;
            }

            if (message.mentions.members.has(message.member.id)) {
                await message.channel.sendTranslated("You cannot timeout yourself, dummy!");
                log("Gracefully aborted attempt to timeout themselves");
                return;
            }

            if (message.mentions.members.has(message.client.user.id)) {
                await message.channel.sendTranslated("You cannot timeout TrixieBot! I own you.");
                log("Gracefully aborted attempt to timeout TrixieBot");
                return;
            }

            const members = message.mentions.members.array();

            for (const member of members) {
                if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) {
                    await message.channel.sendTranslated("You cannot timeout other moderators or admins. That's just rood");
                    log("Gracefully aborted attempt to timeout other user with permissions to manage messages");
                    return;
                }
                msg = msg.replace(
                    new RegExp(member.toString(), "g"),
                    ""
                );
            }

            msg = msg.trim();

            const ms = parseHumanTime(msg);
            if (ms < 10000 || ms > 1000 * 3600 * 24 * 3) {
                await message.channel.sendTranslated("Timeout length should be at least 10 seconds long and shorter than 3 days");
                log(`Gracefully aborted attempt to timeout for longer or shorter than allowed. Value: ${msg}`);
                return;
            }

            const expiresAt = new Date(Date.now() + ms);

            // update message deletion if there
            for (const member of members) {
                await this.db_messages.update({
                    guildId: message.guild.id,
                    memberId: member.id
                }, {
                    $set: {
                        timeoutEnd: expiresAt
                    }
                });
            }

            const promises = members.map(member => this.db.updateOne({ guildId: member.guild.id, memberId: member.id }, { $set: { expiresAt } }, { upsert: true }));

            await message.channel.send(locale.format(locale
                .locale(await message.channel.locale())
                .translate("{{users}} is now timeouted for the next {{timeLeft}}")
                .ifPlural("{{users}} are now timeouted for the next {{timeLeft}}")
                .fetch(members.size), {
                users: members.map(member => member.displayName).join(" "),
                timeLeft: msg
            }));

            await Promise.all(promises);
            log(`Timeouted users ${members.map(member => member.user.username).join(" ")} in guild ${message.guild.name} with ${msg}`);
            return;
        }
    }

    get guildOnly() { return true; }
    get ignore() { return false; }

    usage(prefix) {
        return `\`${prefix}timeout <time> <user mention 1> <user mention 2> ... \`
\`time\` - timeout length. E.g.: \`1h 20m 10s\`, \`0d 100m 70s\` or \`0.5h\` are valid inputs
\`user mention\` - user to timeout. Multiple users possible

\`${prefix}timeout remove <user mention 1> <user mention 2> ... \`
\`user mention\` - user to remove timeout from. Multiple users possible

\`${prefix}timeout clear\` remove all timeouts

\`${prefix}timeout list\` list all timeouts present at the moment`;
    }
}

module.exports = TimeoutCommand;
