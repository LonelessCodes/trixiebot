const log = require("../../modules/log");
const Discord = require("discord.js");
const Command = require("../../class/Command");

class MuteCommand extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("mute");
    }

    async onmessage(message) {
        const muted_words = (await this.db.find({ guildId: message.guild.id }).toArray()).map(doc => doc.word);
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
        if (muted_words.length > 0 && !permission) {
            const content = message.content;
            for (let word of muted_words) {
                if (content.indexOf(word) === -1) continue;

                await message.delete();

                log(`Sent muted message with "${word}" in it from ${message.member.user.username} in guild ${message.guild.name}`);
                return;
            }
        }
        
        if (!message.prefixUsed) return;

        if (/^mute list\b/i.test(message.content)) {
            if (!permission) {
                await message.channel.send("IDK what you're doing here. To use the mute command you must have permissions to manage messages.");
                log("Gracefully aborted attempt to list muted words without the required rights to do so");
                return;
            }

            let str = "";
            if(muted_words.length > 0) {
                str = "Currently muted are:\n";
                str += "`" + muted_words.join("`, `") + "`";
            } else {
                str = "Nothing yet muted"; 
            }

            await message.channel.send(str);
            log(`Sent list of muted words in guild ${message.guild.name}`);
            return;
        }

        if (/^mute clear\b/i.test(message.content)) {
            if (!permission) {
                await message.channel.send("IDK what you're doing here. To use the mute command you must have permissions to manage messages.");
                log("Gracefully aborted attempt to clear all muted words without the required rights to do so");
                return;
            }

            await this.db.deleteMany({ guildId: message.guild.id });

            await message.channel.send("Removed all muted words successfully");
            log(`Removed all muted words in guild ${message.guild.name}`);
            return;
        }

        if (/^mute remove\b/i.test(message.content)) {
            if (!permission) {
                await message.channel.send("IDK what you're doing here. To use the mute command you must have permissions to manage messages.");
                log("Gracefully aborted attempt to remove muted word from user without the required rights to do so");
                return;
            }

            const word = message.content.substr(12).trim();

            if (word === "") {
                await message.channel.send(this.usage(message.prefix));
                log("Requested usage of mute command");
                return;
            }

            await this.db.deleteOne({ guildId: message.guild.id, word });

            await message.channel.send(`Removed muted word "${word}" successfully`);

            log(`Removed muted word "${word}" in guild ${message.guild.name}`);
            return;
        }

        if (/^mute\b/i.test(message.content)) {
            if (!permission) {
                message.channel.send("IDK what you're doing here. To use the mute command you must have permissions to manage messages.");
                log("Gracefully aborted attempt to mute word without the required rights to do so");
                return;
            }

            /**
             * @type {string}
             */
            const word = message.content.substr(5).trim();

            if (word === "") {
                await message.channel.send(this.usage(message.prefix));
                log("Requested usage of mute command");
                return;
            }

            if (muted_words.includes(word)) {
                await message.channel.send("Already got this muted");
                log("Word already muted");
                return;
            }

            await this.db.insertOne({ guildId: message.guild.id, word });

            await message.channel.send(`Got it! Blacklisted use of "${word}"`);

            log(`Muted word "${word}" in ${message.guild.id}`);
            return;
        }
    }

    usage(prefix) {
        return `\`${prefix}mute <phrase>\`
\`phrase\` - Word or phrase to be blacklisted

\`${prefix}mute remove <phrase>\`
\`phrase\` - Word or phrase to be unmuted

\`${prefix}mute clear\` remove all muted words

\`${prefix}mute list\` list all muted words and phrases`;
    }
    get ignore() {
        return false;
    }
}

module.exports = MuteCommand;
