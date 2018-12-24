const log = require("../../modules/log");
const Discord = require("discord.js");

const BaseCommand = require("../../class/BaseCommand");
const TreeCommand = require("../../class/TreeCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const CommandPermission = require("../../logic/commands/CommandPermission");
const Category = require("../../logic/commands/Category");

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("mute");

    const permission = new CommandPermission.CommandPermission([Discord.Permissions.FLAGS.MANAGE_MESSAGES]);

    const muteCommand = cr.register("mute", new class extends TreeCommand {
        async noPermission(message) {
            await message.channel.sendTranslated("IDK what you're doing here. To use the mute command you must have permissions to manage messages.");
        }

        async beforeProcessCall(message, content) {
            const muted_words = (await database.find({ guildId: message.guild.id }).toArray()).map(doc => doc.word);

            if (muted_words.length > 0 && !permission.test(message.member)) {
                const msg = content.toLowerCase();
                for (const word of muted_words) {
                    if (msg.indexOf(word) === -1) continue;

                    await message.delete();
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
    
    const removeCommand = new class extends BaseCommand {
        async call(message, content) {
            const word = content.trim().toLowerCase();

            if (word === "") {
                return;
            }

            await database.deleteOne({ guildId: message.guild.id, word });

            await message.channel.sendTranslated("Removed muted word \"{{word}}\" successfully", {
                word
            });

            log(`Removed muted word "${word}" in guild ${message.guild.name}`);
        }
    };

    muteCommand.registerSubCommand("remove", removeCommand)
        .setHelp(new HelpContent()
            .setUsage("<phrase>")
            .addParameter("phrase", "Word or phrase to be unmuted/unblacklisted"));
    
    cr.register("unmute", removeCommand);

    muteCommand.registerSubCommand("clear", new class extends BaseCommand {
        async call(message) {
            await database.deleteMany({ guildId: message.guild.id });

            await message.channel.sendTranslated("Removed all muted words successfully");
            log(`Removed all muted words in guild ${message.guild.name}`);
        }
    })
        .setHelp(new HelpContent()
            .setUsage("", "Remove all muted words"));

    muteCommand.registerSubCommand("list", new class extends BaseCommand {
        async call(message, content, muted_words) {
            let str = "";
            if (muted_words.length > 0) {
                str = await message.channel.translate("Currently muted are:") + "\n";
                str += "`" + muted_words.join("`, `") + "`";
            } else {
                str = await message.channel.translate("Nothing yet muted");
            }

            await message.channel.send(str);
            log(`Sent list of muted words in guild ${message.guild.name}`);
        }
    })
        .setHelp(new HelpContent()
            .setUsage("", "list all muted words and phrases"));

    muteCommand.registerDefaultCommand(new class extends BaseCommand {
        async call(message, content, muted_words) {
            /**
             * @type {string}
             */
            const word = content.trim().toLowerCase();

            if (word === "") {
                return;
            }

            if (muted_words.includes(word)) {
                await message.channel.sendTranslated("Already got this muted");
                log("Word already muted");
                return;
            }

            await database.insertOne({ guildId: message.guild.id, word });

            await message.channel.sendTranslated("Got it! Blacklisted use of \"{{word}}\"", {
                word
            });

            log(`Muted word "${word}" in ${message.guild.id}`);
        }
    });

    muteCommand.registerSubCommandAlias("*", "add");
};