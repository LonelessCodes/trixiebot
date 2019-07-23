const Discord = require("discord.js");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const OverloadCommand = require("../../core/commands/OverloadCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const Category = require("../../util/commands/Category");

module.exports = function install(cr, client, config, db) {
    const database = db.collection("mute");

    const permission = new CommandPermission([Discord.Permissions.FLAGS.MANAGE_MESSAGES]);

    const muteWordCommand = cr.registerCommand("muteword", new class extends TreeCommand {
        async noPermission(message) {
            await message.channel.sendTranslated("IDK what you're doing here. To use the mute command you must have permissions to manage messages.");
        }

        /**
         * TODO: CACHE DATABASE STUFF
         */

        async beforeProcessCall(message, content) {
            if (message.channel.type !== "text") return [];

            const muted_words = (await database.find({ guildId: message.guild.id }).toArray()).map(doc => doc.word);

            if (muted_words.length > 0 && !permission.test(message.member)) {
                const msg = content.toLowerCase();
                for (const word of muted_words) {
                    if (msg.indexOf(word) === -1) continue;

                    await message.delete().catch(() => { /* Do nothing */ });
                    return;
                }
            }

            return muted_words;
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Mute/Blacklist specific words in this server")
            .setUsage("<phrase>")
            .addParameter("phrase", "Word or phrase to be muted/blacklisted"))
        .setCategory(Category.MODERATION)
        .setPermissions(permission)
        .setIgnore(false);

    const removeCommand = new OverloadCommand()
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            const word = content.trim().toLowerCase();

            await database.deleteOne({ guildId: message.guild.id, word });

            await message.channel.sendTranslated("Removed muted word \"{{word}}\" successfully", { word });
        }))
        .setHelp(new HelpContent()
            .setUsage("<phrase>")
            .addParameter("phrase", "Word or phrase to be unmuted/unblacklisted"));

    muteWordCommand.registerSubCommand("remove", removeCommand);
    cr.registerCommand("unmute", removeCommand);

    muteWordCommand.registerSubCommand("clear", new SimpleCommand(async message => {
        await database.deleteMany({ guildId: message.guild.id });

        await message.channel.sendTranslated("Removed all muted words successfully");
    }))
        .setHelp(new HelpContent().setUsage("", "Remove all muted words"));

    muteWordCommand.registerSubCommand("list", new SimpleCommand(async (message, content, { pass_through: muted_words }) => {
        let str = "";
        if (muted_words.length > 0) {
            str = await message.channel.translate("Currently muted are:") + "\n";
            str += "`" + muted_words.join("`, `") + "`";
        } else {
            str = await message.channel.translate("Nothing yet muted");
        }

        return str;
    }))
        .setHelp(new HelpContent().setUsage("", "list all muted words and phrases"));

    muteWordCommand.registerDefaultCommand(new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async (message, content, { pass_through: muted_words }) => {
            /**
             * @type {string}
             */
            const word = content.trim().toLowerCase();

            if (muted_words.includes(word)) {
                await message.channel.sendTranslated("Already got this muted");
                return;
            }

            await database.insertOne({ guildId: message.guild.id, word });

            await message.channel.sendTranslated("Got it! Blacklisted use of \"{{word}}\"", { word });
        }));

    muteWordCommand.registerSubCommandAlias("*", "add");
};
