const { userToString } = require("../../modules/util");

const BaseCommand = require("../../class/BaseCommand");
const TreeCommand = require("../../class/TreeCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const CommandPermission = require("../../logic/commands/CommandPermission");
const Category = require("../../logic/commands/Category");

const Paginator = require("../../logic/Paginator");

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("deleted_messages");
    database.createIndex("timestamp", { expireAfterSeconds: 7 * 24 * 3600 });

    client.on("messageDelete", async message => {
        if (message.author.bot) return;
        if (message.author.id === client.user.id) return;
        if (message.content === "") return;
        await database.insertOne({
            guildId: message.guild.id,
            memberId: message.author.id,
            name: message.author.username + "#" + message.author.discriminator,
            channelId: message.channel.id,
            messageId: message.id,
            message: message.content,
            timestamp: new Date(message.createdTimestamp)
        });
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
            const messages = await database.find({
                guildId: message.guild.id
            }).toArray();

            if (messages.length === 0) {
                await message.channel.sendTranslated("Yeeeeah, nothing found");
                return;
            }

            const page_limit = 10;
            
            const items = [];
            for (const deleted_message of messages) {
                let str = "";
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
                items.push(str);
            }

            const paginator = new Paginator("Deleted Messages", `Messages deleted or edited by users: **${items.length}**\n`, page_limit, items, message.author);
            paginator.display(message.channel);
        }
    });
};