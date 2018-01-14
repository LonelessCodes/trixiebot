const log = require("../modules/log");
const Discord = require("discord.js");
const { timeout, deletedMessages } = require("../modules/admin");
const { toHumanTime, parseHumanTime } = require("../modules/util");
const Command = require("../modules/Command");

const command = new Command(async function onmessage(message) {
    if (await timeout.has(message.guild.id, message.member.id)) {
        const content = message.content;
        await message.delete();
        await message.channel.send(`${message.member.toString()} You've been timeouted from writing in this server. I didn't throw your message away, you can check on it using \`!timeout my messages\`, so you can send it again when your timeout is over in __**${toHumanTime((await timeout.get(message.guild.id, message.member.id)).expiresAt.getTime() - Date.now())}**__`);
        log(`Sent timeout notice to user ${message.member.user.username} in guild ${message.guild.name} and saved their message before deletion`);
        return;
    }

    if (/^\!kick\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.KICK_MEMBERS);
        if (!permission) {
            await message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Kick");
            log("Gracefully aborted attempt to kick user without the required rights to do so");
            return;
        }

        // const member = 
        return;
    }
    if (/^\!ban\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.BAN_MEMBERS);
        if (!permission) {
            await message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Ban");
            log("Gracefully aborted attempt to ban user without the required rights to do so");
            return;
        }

        // const member = 
        return;
    }

    if (/^\!timeout list\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
        if (!permission) {
            await message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-List-Timeouts. To use the timeout command you must have permissions to manage messages.");
            log("Gracefully aborted attempt to list timeouts without the required rights to do so");
            return;
        }

        let longestName = 0;
        let longestString = 0;
        const timeouts = (await timeout.entries(message.guild.id)).map(timeout => {
            timeout.member = message.guild.members.has(timeout.memberId) ?
                message.guild.members.get(timeout.memberId) :
                null;
            if (longestName < timeout.member.displayName.length) {
                longestName = timeout.member.displayName.length;
            }
            timeout.string = toHumanTime(timeout.expiresAt.getTime() - Date.now());
            if (longestString < timeout.string.length) {
                longestString = timeout.string.length;
            }
            return timeout;
        }).filter(timeout => !!timeout.member);
        let str = "```";
        for (let timeout of timeouts) {
            str += "\n";
            str += timeout.member.displayName;
            str += new Array(longestName - timeout.member.displayName.length).fill(" ").join("");
            str += " | ";
            str += timeout.string;
        }
        str += "\n```";
        await message.channel.send(str);
        log(`Sent list of timeouts in guild ${message.guild.name}`);
        return;
    }

    if (/^\!timeout clear\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
        if (!permission) {
            await message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Timeout. To use the timeout command you must have permissions to manage messages.");
            log("Gracefully aborted attempt to clear all timeouts without the required rights to do so");
            return;
        }

        await timeout.delete(message.guild.id);

        await message.channel.send("Removed all timeouts successfully");
        log(`Removed all timeouts in guild ${message.guild.name}`);
        return;
    }

    if (/^\!timeout remove\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
        if (!permission) {
            await message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Timeout. To use the timeout command you must have permissions to manage messages.");
            log("Gracefully aborted attempt to remove timeout from user without the required rights to do so");
            return;
        }

        const members = message.mentions.members.array();

        const promises = members.map(member => timeout.delete(member.guild.id, member.id));

        await message.channel.send(`Removed timeouts for ${members.map(member => member.displayName).join(" ")} successfully`);

        await Promise.all(promises);
        log(`Removed timeout from users ${members.map(member => member.user.username).join(" ")} in guild ${message.guild.name}`);
        return;
    }

    if (/^\!timeout\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
        if (!permission) {
            message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Timeout. To use the timeout command you must have permissions to manage messages.");
            log("Gracefully aborted attempt to timeout user without the required rights to do so");
            return;
        }

        /**
         * @type {string}
         */
        let msg = message.content.trim().replace(/\s+/g, " ");
        msg = msg.substring(9, Math.max(9, msg.length));

        if (msg === "") {
            await message.channel.send(this.usage);
            log("Requested usage of timeout command");
            return;
        }

        if (message.mentions.members.has(message.member.id)) {
            await message.channel.send("You cannot timeout yourself, dummy!");
            log("Gracefully aborted attempt to timeout themselves");
            return;
        }

        if (message.mentions.members.has(message.client.user.id)) {
            await message.channel.send("You cannot timeout TrixieBot! I own you.");
            log("Gracefully aborted attempt to timeout TrixieBot");
            return;
        }

        const members = message.mentions.members.array();

        for (const member of members) {
            if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) {
                await message.channel.send("You cannot timeout other moderators or admins");
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
            await message.channel.send("Timeout length should be at least 10 seconds long and shorter than 3 days");
            log(`Gracefully aborted attempt to timeout for longer or shorter than allowed. Value: ${msg}`);
            return;
        }

        const promises = members.map(member => timeout.set(member.guild.id, member.id, ms));

        await message.channel.send(`Timeouted ${members.map(member => member.displayName).join(" ")} for ${msg} successfully`);
        
        await Promise.all(promises);
        log(`Timeouted users ${members.map(member => member.user.username).join(" ")} in guild ${message.guild.name} with ${msg}`);
        return;
    }
}, {
    usage: `\`!timeout <time> <user mention 1> <user mention 2> ... \`
\`time\` - timeout length. E.g.: \`1h 20m 10s\`, \`0d 100m 70s\` or \`0.5h\` are valid inputs
\`user mention\` - user to timeout. Multiple users possible

\`!timeout remove <user mention 1> <user mention 2> ... \`
\`user mention\` - user to remove timeout from. Multiple users possible

\`!timeout clear\` remove all timeouts

\`!timeout list\` list all timeouts present at the moment`
});

module.exports = command;
