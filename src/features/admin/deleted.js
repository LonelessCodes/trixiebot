const { userToString } = require("../../modules/util");
const log = require("../../modules/log");
const CONST = require("../../modules/CONST");
const Discord = require("discord.js");

const BaseCommand = require("../../class/BaseCommand");
const TreeCommand = require("../../class/TreeCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const CommandPermission = require("../../logic/commands/CommandPermission");
const Category = require("../../logic/commands/Category");

const Pagination = require("../../logic/Pagination");

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("deleted_messages");
    database.createIndex("timestamp", { expireAfterSeconds: 7 * 24 * 3600 });

    client.on("messageDelete", async message => {
        if (message.author.bot) return;
        if (message.author.id === client.user.id) return;
        if (message.content === "") return;
        await database.insertOne({
            guildId: message.guild.id,
            memberId: message.member.id,
            channelId: message.channel.id,
            messageId: message.id,
            message: message.content,
            timestamp: new Date(message.createdTimestamp)
        });
        log(`Caught deleted message ${message.id}`);
    });

    const prune = () => database.deleteMany({ timestamp: { $lt: new Date(Date.now() - 7 * 24 * 3600 * 1000) } });
    prune();
    setInterval(prune, 60 * 1000);

    // Registering down here

    const deletedCommand = cr.register("deleted", new class extends TreeCommand {
        async noPermission(message) {
            await message.channel.sendTranslated("No boi, git gud");
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Trixie can collect deleted for up to 7 days, so you always know what's going on in your server behind your back.\nCommand enabled by default. Soon option to turn it off")
            .setUsage("", "List all deleted messages from the last 7 days"))
        .setCategory(Category.MODERATION)
        .setPermissions(CommandPermission.ADMIN);
    
    deletedCommand.registerSubCommand("clear", new class extends BaseCommand {
        async call(message) {
            await database.deleteMany({ guildId: message.guild.id });

            await message.channel.sendTranslated("Removed all deleted messages successfully");
        }
    })
        .setHelp(new HelpContent()
            .setUsage("", "Clears list of deleted messages"));

    deletedCommand.registerDefaultCommand(new class extends BaseCommand {
        async call(message) {
            const doc_count = await database.countDocuments({
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
                const messages = await database.find({
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
                    if (member) str += `${userToString(member)}: `;
                    else str += "**deleted user**: ";

                    str += "\n";
                    str += `\`${deleted_message.message.replace(/`/g, "´")}\``;
                    str += "\n";
                    str += "\n";
                }

                embed.setDescription(str);

                await message.channel.send({ embed });
            });
        }
    });
};