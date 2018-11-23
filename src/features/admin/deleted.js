const log = require("../../modules/log");
const CONST = require("../../modules/CONST");
const Events = require("events");
const Discord = require("discord.js");
const Command = require("../../class/Command");

class Pagination extends Events {
    constructor(page_limit, count, authorId, awaitMessages) {
        super();

        this.pages_count = Math.ceil(count / page_limit);

        const listen = () => {
            awaitMessages(message => {
                if (message.author.id !== authorId) return;
                if (/^exit/i.test(message.content)) return true;
                if (!/^\d+$/.test(message.content)) return;

                const page_number = parseInt(message.content);

                this.emit("change", (page_number - 1) * page_limit, page_limit, page_number);

                listen();
                return true;
            }, {
                max: 1,
                time: 60000
            });
        };
        listen();
    }
}

class DeletedMessagesCommand extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("deleted_messages");
        this.db.createIndex("timestamp", { expireAfterSeconds: 7 * 24 * 3600 });

        this.client.on("messageDelete", async message => {
            if (message.author.id === this.client.user.id) return;
            if (message.content === "") return;
            await this.db.insertOne({
                guildId: message.guild.id,
                memberId: message.member.id,
                channelId: message.channel.id,
                messageId: message.id,
                message: message.content,
                timestamp: new Date(message.createdTimestamp)
            });
            log(`Caught deleted message ${message.id}`);
        });

        const purge = () => this.db.deleteMany({ timestamp: { $lt: new Date(Date.now() - 7 * 24 * 3600 * 1000) } });
        purge();
        setInterval(purge, 60 * 1000);
    }
    async onmessage(message) {
        if (!message.prefixUsed) return;

        if (!/^deleted\b/i.test(message.content)) return;

        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES);
        if (!permission) {
            await message.channel.sendTranslated("No boi, git gud");
            log("Gracefully aborted attempt to clear all deleted messages without the required rights to do so");
            return;
        }

        if (/^deleted clear\b/i.test(message.content)) {
            await this.db.deleteMany({ guildId: message.guild.id });

            await message.channel.sendTranslated("Removed all deleted messages successfully");
            log(`Removed all deleted messages in guild ${message.guild.name}`);
            return;
        }

        const doc_count = await this.db.countDocuments({
            guildId: message.guild.id
        });

        if (doc_count === 0) {
            await message.channel.sendTranslated("Yeeeeah, nothing found");
            log("Sent deleted messages. None exist");
            return;
        }

        const page_limit = 10;

        const pages = new Pagination(page_limit, doc_count, message.author.id, message.channel.awaitMessages.bind(message.channel));

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        embed.setTitle("Deleted Messages");
        embed.setDescription(`Messages deleted or edited by users: **${doc_count}**\n` +
            `Total pages: **${pages.pages_count}**\n` + 
            "Type the page number you want to look at. Sorted oldest to newest message");

        await message.channel.send({ embed });

        pages.on("change", async (skip, limit, page_number) => {
            const messages = await this.db.find({
                guildId: message.guild.id
            }).skip(skip).limit(limit).toArray();

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

            embed.setFooter(`Deleted Messages - Page ${page_number}/${pages.pages_count}`);

            let str = "";
            for (const deleted_message of messages) {
                const channel = message.guild.channels.get(deleted_message.channelId);
                if (channel) str += `# **${channel.name}**`;
                else str += "# **deleted channel**";

                const timestamp = deleted_message.timestamp.toLocaleString().slice(0, -3);
                str += ` | ${timestamp} | `;

                const member = message.guild.members.get(deleted_message.memberId);
                if (member) str += `**${member.displayName}**: `;
                else str += "**deleted user**";

                str += "\n";
                str += `\`${deleted_message.message.replace(/`/g, "´")}\``;
                str += "\n";
                str += "\n";
            }

            embed.setDescription(str);

            await message.channel.send({ embed });
        });

        log("Sent deleted messages");
        return;
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return `\`${prefix}deleted clear\` clears list of deleted messages

\`${prefix}deleted\` list all deleted messages from the last 7 days`;
    }
}

module.exports = DeletedMessagesCommand;
