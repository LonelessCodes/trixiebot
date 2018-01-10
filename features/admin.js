const Discord = require("discord.js");
const ignore = require("../modules/ignore");
const Command = require("../modules/Command");

const names = ["d", "h", "m", "s"];

function pad(num, size) {
    const s = "000000000" + num;
    return s.substr(s.length-size);
}

function toHumanTime(ms) {
    const d = new Date(ms);
    const arr = [
        d.getDate() - 1,
        d.getHours() - 1,
        d.getMinutes(),
        d.getSeconds()
    ];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i]) // 0 is short for false, so if not 0, go on
            arr[i] = pad(arr[i], 2) + names[i];
    }
    return arr.filter(str => !!str).join(" ");
}

const multiplier = {
    "d": 1000 * 3600 * 24,
    "h": 1000 * 3600,
    "m": 1000 * 60,
    "s": 1000,
    "ms": 1
};

/**
 * @param {string} string
 */
function parseHumanTime(string) {
    let ms = 0;
    let number = "0";

    const matches = string.match(/[0-9.]+|\w+/g);
    for (let match of matches) {
        if (/[0-9.]+/.test(match)) {
            number += match;
        } else if (/\w+/.test(match)) {
            const num = Number.parseFloat(number);
            number = "0";
            if (multiplier[match]) ms += num * multiplier[match];
        }
    }

    return ms;
}

const command = new Command(async function onmessage(message) {
    if (await ignore.has(message.guild.id, message.member.id)) {
        const content = message.content;
        await message.delete();
        await message.channel.send(`${message.member.toString()} You've been timeouted from writing in this server. I didn't throw your message away, you can check on it using \`!timeout my messages\`, so you can send it again when your timeout is over in __**${toHumanTime((await ignore.get(message.guild.id, message.member.id)).getTime() - Date.now())}**__`);
        return;
    }

    if (/^\!kick\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.KICK_MEMBERS);
        if (!permission) {
            message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Kick");
            return;
        }

        // const member = 
        return;
    }
    if (/^\!ban\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.BAN_MEMBERS);
        if (!permission) {
            message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Ban");
            return;
        }

        // const member = 
        return;
    }

    if (/^\!timeout remove\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
        if (!permission) {
            message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Timeout. To use the timeout command you must have permissions to manage messages.");
            return;
        }

        const members = message.mentions.members.array();

        members.forEach(async member => await ignore.delete(member.guild.id, member.id));

        message.channel.send(`Removed timeouts for ${members.map(member => member.toString()).join(" ")} successfully`);
        return;
    }

    if (/^\!timeout\b/i.test(message.content)) {
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
        if (!permission) {
            message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Timeout. To use the timeout command you must have permissions to manage messages.");
            return;
        }

        /**
         * @type {string}
         */
        let msg = message.content.trim().split(/ +/g).join(" ");
        msg = msg.substring(9, Math.max(9, msg.length));

        if (msg === "") {
            message.channel.send(this.usage);
            return;
        }

        if (message.mentions.members.has(message.member.id)) {
            message.channel.send("You cannot timeout yourself, dummy!");
            return;
        }

        if (message.mentions.members.has(message.client.user.id)) {
            message.channel.send("You cannot timeout TrixieBot! I own you.");
            return;
        }

        const members = message.mentions.members.array();

        for (const member of members) {
            if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) {
                message.channel.send("You cannot timeout other moderators or admins");
            }
            msg = msg.replace(
                new RegExp(member.toString(), "g"),
                ""
            );
        }

        msg = msg.trim();
        
        const timeout = parseHumanTime(msg);
        if (timeout < 10000 || timeout > 1000 * 3600 * 24 * 3) {
            message.channel.send("Timeout length should be at least 10 seconds long and shorter than 3 days");
            return;
        }

        members.forEach(async member => await ignore.set(member.guild.id, member.id, timeout));

        message.channel.send(`Timeouted ${members.map(member => member.toString()).join(" ")} for ${msg} successfully`);
        return;
    }
}, {
    usage: `\`!timeout <time> <user mention 1> <user mention 2> ... \`
\`time\` - timeout length. E.g.: \`1h 20m 10s\`, \`0d 100m 70s\` or \`0.5h\` are valid inputs
\`user mention\` - user to timeout. Multiple users possible

\`!timeout remove <user mention 1> <user mention 2> ... \`
\`user mention\` - user to remove timeout from. Multiple users possible`
});

module.exports = command;
