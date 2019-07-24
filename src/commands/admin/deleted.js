/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { userToString } = require("../../util/util");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const HelpContent = require("../../util/commands/HelpContent");
const CommandPermission = require("../../util/commands/CommandPermission");
const Category = require("../../util/commands/Category");

const Paginator = require("../../util/commands/Paginator");

module.exports = function install(cr, client, config, db) {
    const database = db.collection("deleted_messages");
    database.createIndex("deletedAt", { expireAfterSeconds: 7 * 24 * 3600 });
    database.createIndex("editedAt", { expireAfterSeconds: 3 * 24 * 3600 });
    database.createIndex({ messageId: 1 }, { unique: true });

    client.on("messageDelete", async message => {
        if (message.author.bot) return;
        if (message.author.id === client.user.id) return;
        if (message.content === "") return;
        if (message.channel.type !== "text") return;

        await database.updateOne({
            messageId: message.id,
        }, {
            $set: {
                guildId: message.guild.id,
                channelId: message.channel.id,
                userId: message.author.id,
                name: message.author.tag,
                attachments: message.attachments.array().map(a => ({ url: a.url, size: a.filesize, isImg: a.width && a.height })),
                createdAt: message.createdAt,
                deletedAt: new Date,
                deleted: true,
            },
            $push: {
                edits: {
                    content: message.content,
                    editedAt: message.editedAt || message.createdAt,
                },
            },
            $unset: {
                editedAt: 1,
            },
        }, { upsert: true });
    });

    client.on("messageUpdate", async (message, new_message) => {
        if (message.author.bot) return;
        if (message.author.id === client.user.id) return;
        if (message.channel.type !== "text") return;

        await database.updateOne({
            messageId: message.id,
        }, {
            $set: {
                guildId: message.guild.id,
                channelId: message.channel.id,
                userId: message.author.id,
                name: message.author.tag,
                attachments: message.attachments.array().map(a => ({ url: a.url, size: a.filesize, isImg: a.width && a.height })),
                createdAt: message.createdAt,
                editedAt: new_message.editedAt,
                deleted: false,
            },
            $push: {
                edits: {
                    content: message.content,
                    editedAt: message.editedAt || message.createdAt,
                },
            },
        }, { upsert: true });
    });

    // Registering down here

    const deletedCommand = cr.registerCommand("deleted", new class extends TreeCommand {
        async noPermission(message) {
            await message.channel.sendTranslated("No boi, git gud");
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Trixie can collect deleted for up to 7 days, so you always know what's going on in your server behind your back.\nCommand enabled by default. Soon option to turn it off")
            .setUsage("", "List all deleted messages from the last 7 days"))
        .setCategory(Category.MODERATION)
        .setPermissions(CommandPermission.ADMIN);

    deletedCommand.registerSubCommand("clear", new SimpleCommand(async message => {
        await database.deleteMany({ guildId: message.guild.id });

        await message.channel.sendTranslated("Removed all deleted messages successfully");
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Clears list of deleted messages"));

    deletedCommand.registerDefaultCommand(new SimpleCommand(async message => {
        const messages = await database.find({
            guildId: message.guild.id,
        }).toArray();

        if (messages.length === 0) {
            await message.channel.sendTranslated("Yeeeeah, nothing found");
            return;
        }

        const page_limit = 10;

        const items = [];
        for (const deleted_message of messages.filter(m => "deletedAt" in m).sort((a, b) => b.deletedAt - a.deletedAt)) {
            let str = "";
            const channel = message.guild.channels.get(deleted_message.channelId);
            if (channel) str += `# **${channel.name}**`;
            else str += "# **deleted channel**";

            const timestamp = deleted_message.deletedAt.toLocaleString().slice(0, -3);
            str += ` | ${timestamp} | `;

            const member = message.client.users.get(deleted_message.userId);
            if (member) str += `${userToString(member)}: `;
            else str += `**${deleted_message.name}**: `;

            str += "\n";
            str += `\`${deleted_message.edits[deleted_message.edits.length - 1].content.replace(/`/g, "´")}\``;
            items.push(str);
        }

        new Paginator(
            "Deleted Messages",
            `Messages deleted or edited by users: **${items.length}**\n`,
            page_limit, items, message.author, { guild: message.guild }
        ).display(message.channel);
    }));
};
