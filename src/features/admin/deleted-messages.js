const log = require("../../modules/log");
const Discord = require("discord.js");
const Command = require("../../class/Command");

class DeletedMessagesCommand extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("deleted_messages");
        this.db.createIndex("timestamp", { expireAfterSeconds: 7 * 24 * 3600 });

        this.client.on("messageDelete", async message => {
            if (message.content === "") return;
            await this.db.insertOne({
                guildId: message.guild.id,
                memberId: message.member.id,
                channelId: message.channel.id,
                messageId: message.id,
                message: message.content,
                timestamp: message.createdTimestamp
            });
            log(`Caught deleted message ${message.id}`);
        });
    }
    async onmessage(message) {
        if (!message.prefixUsed) return;
        
        if (/^deleted clear\b/i.test(message.content)) {
            const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
            if (!permission) {
                await message.channel.send("No boi, git gud");
                log("Gracefully aborted attempt to clear all deleted messages without the required rights to do so");
                return;
            }

            await this.db.deleteMany({ guildId: message.guild.id });

            await message.channel.send("Removed all deleted messages successfully");
            log(`Removed all deleted messages in guild ${message.guild.name}`);
            return;
        }

        if (/^deleted\b/i.test(message.content)) {
            const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
            if (!permission) {
                await message.channel.send("No boi, git gud");
                log("Gracefully aborted attempt to list deleted messages without the required rights to do so");
                return;
            }

            const messages = await this.db.find({
                guildId: message.guild.id
            }).toArray();

            if (messages.length === 0) {
                await message.channel.send("Yeeeeah, nothing found");
                log("Sent deleted messages. None exist");
                return;
            }

            const channels = new Object;

            messages.forEach(deletedMessage =>
                channels[deletedMessage.channelId] ?
                    channels[deletedMessage.channelId].push(deletedMessage) :
                    channels[deletedMessage.channelId] = [deletedMessage]);

            const embed = new Discord.RichEmbed;

            for (const channelId in channels) {
                const messages = channels[channelId].sort((a, b) => b.timestamp - a.timestamp);

                let str = "";

                for (const deletedMessage of messages) {
                    const timestamp = new Date(deletedMessage.timestamp).toLocaleString().slice(0, -3);
                    str += `\`${timestamp}\` `;

                    const member = message.guild.members.get(deletedMessage.memberId);
                    if (member) str += `**${member.displayName}**: `;

                    str += `\`${deletedMessage.message.replace(/`/g, "´")}\``;
                    str += "\n";
                }
                str += "\n";

                embed.addField(`#${message.guild.channels.get(channelId).name}`, str);
            }

            await message.channel.send({ embed });
            log("Sent deleted messages");
            return;
        }
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return `\`${prefix}deleted clear\` clears list of deleted messages

\`${prefix}deleted\` list all deleted messages from the last 7 days`;
    }
}

module.exports = DeletedMessagesCommand;
