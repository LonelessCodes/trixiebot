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

const { CronJob } = require("cron");
const { fetchMember, basicEmbed, userToString } = require("../util/util");
const { pad } = require("../util/string");
const moment = require("moment");
const Discord = require("discord.js");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandPermission = require("../util/commands/CommandPermission");
const CommandScope = require("../util/commands/CommandScope");

const Paginator = require("../util/commands/Paginator");

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("birthday");
    const database_config = db.collection("birthday_config");

    const tick = async () => {
        /** @type {({ userId: string; year: number; month: number; date: number })[]} */
        const users = await database.find({}).toArray();
        /** @type {({ guildId: string; enabled: boolean; roleId: string })[]} */
        const configs = await database_config.find({}).toArray();

        const today = moment();
        const month = today.month();
        const date = today.date();
        const leap_year = today.isLeapYear();

        for (let [, guild] of client.guilds) {
            // find config
            const config = configs.find(c => c.guildId === guild.id);
            if (!config) continue;

            // has set role id?
            if (!config.roleId) continue;
            // role exists??
            const role = guild.roles.get(config.roleId);
            if (!role) {
                await database_config.updateOne({ guildId: guild.id }, { $set: { roleId: null } });
                continue;
            }

            for (let user of users) {
                // has member?
                const member = await fetchMember(guild, user.userId);
                if (!member) continue;

                // does member have the role?
                const has_role = member.roles.has(role.id);
                let is_birthday = user.month === month && user.date === date;
                // fallback to a 28th Feb in a non-leap-year if user was born on 29th Feb
                if (!leap_year && user.month === 1 && user.date === 29 && month === 1 && date === 28) {
                    is_birthday = true;
                }

                // if member has role and it's not their birthday or is disabled
                if ((!is_birthday || !config.enabled) && has_role) member.removeRole(role).catch(() => { /* Do nothing */ });
                // if member doesn't have role and it's their birthday
                else if (is_birthday && !has_role) member.addRole(role).catch(() => { /* Do nothing */ });
            }
        }
    };

    // eslint-disable-next-line no-warning-comments
    // TODO: allow instant updating
    // Run every hour instead of every day to update new entries at least hourly
    new CronJob("0 0 * * * *", tick).start();
    await tick();

    const birthdayCmd = cr.registerCommand("birthday", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Automatically give birthday boiz in your server a specific role.")
            .setUsage("<YYYY-MM-DD>", "Set your birthday")
            .addParameterOptional("YYYY-MM-DD", "Your b-day in Year-Month-Day format"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);

    /**
     * SUB COMMANDS
     */

    const MAX_CHANGES = 3;

    birthdayCmd.registerDefaultCommand(new OverloadCommand)
        .setScope(CommandScope.ALL)
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            const userId = message.author.id;

            if (await database.findOne({ userId, times_changed: MAX_CHANGES })) {
                return `You have used up all your ${MAX_CHANGES} chances to change your birthday`;
            }

            const time = moment(content, ["MM-DD-YYYY", "YYYY-MM-DD"]);

            if (!time.isValid()) return "Nohhhh, do it like this, pls: YYYY-MM-DD";

            const doc = await database.findOneAndUpdate({ userId }, {
                $set: { year: time.year(), month: time.month(), date: time.date() },
                $inc: { times_changed: 1 },
            }, { upsert: true, returnOriginal: false });

            const times_left = MAX_CHANGES - doc.value.times_changed;
            return `Set your birthday to ${pad(time.month() + 1, 2)}/${pad(time.date(), 2)}!` +
                (times_left > 0 ? ` If this was wrong, you have ${times_left} changes left.` : "");
        }));

    birthdayCmd.registerSubCommand("reset", new SimpleCommand(async message => {
        const userId = message.author.id;

        await database.deleteOne({ userId });

        return "Done did! I no longer know your birthday";
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Reset your birthday. Trixie will no longer know it."))
        .setScope(CommandScope.ALL);

    // eslint-disable-next-line no-warning-comments
    // TODO: Comment this back in when profiles are implemented

    // birthdayCmd.registerSubCommand("showyear", new SimpleCommand(async message => {
    //     const userId = message.author.id;

    //     await database.updateOne({ userId }, { $set: { hide_year: false } }, { upsert: true });

    //     return "Your birth year is no longer public!";
    // }))
    //     .setHelp(new HelpContent()
    //         .setUsage("", "Make your birth year publicly visible"))
    //     .setScope(CommandScope.ALL);

    // birthdayCmd.registerSubCommand("hideyear", new SimpleCommand(async message => {
    //     const userId = message.author.id;

    //     await database.updateOne({ userId }, { $set: { hide_year: true } }, { upsert: true });

    //     return "No one will ever see your birth year now :eyes:";
    // }))
    //     .setHelp(new HelpContent()
    //         .setUsage("", "Hide your birth year from the public"))
    //     .setScope(CommandScope.ALL);

    birthdayCmd.registerSubCommand("month", new OverloadCommand)
        .setHelp(new HelpContent()
            .setUsage("<month>", "List all birthdays in this month in the server")
            .addParameter("month", "The month as a number. 1 for January, 2 for February, and so on."))
        .registerOverload("1+", new SimpleCommand(async (message, month_str) => {
            const month = parseInt(month_str) - 1;
            if (Number.isNaN(month) || month < 1 || month > 12) {
                return `"${month_str}" is not a valid month. Type 1 for January, 2 for February, and so on.`;
            }

            const users = await database.find({ month }).toArray();
            const members = [];
            for (let user of users) {
                const member = await fetchMember(message.guild, user.userId);
                if (!member) continue;
                members.push(`${pad(month + 1, 2)}/${pad(user.date, 2)} - ${userToString(member)}`);
            }

            new Paginator(
                "Birthdays",
                `All birthdays in month ${pad(month + 1, 2)}`,
                15, members, message.author, { guild: message.guild }
            ).display(message.channel);
        }));

    /*
     * ADMIN CMDS
     */

    const birthdayAdminCmd = birthdayCmd.registerSubCommand("config", new TreeCommand)
        .setHelp(new HelpContent()
            .setUsageTitle("Admin Area")
            .setUsage("", "Configure the automatic birthday role thing in your server"))
        .setPermissions(new CommandPermission([Discord.Permissions.FLAGS.MANAGE_ROLES]));

    birthdayAdminCmd.registerSubCommand("role", new OverloadCommand)
        .setHelp(new HelpContent()
            .setUsage("<role name>", "Set the birthday boy role")
            .addParameter("role name", "The birthday role name"))
        .registerOverload("1+", new SimpleCommand(async (message, role_str) => {
            const guild = message.guild;
            const me = guild.me;
            if (!me.hasPermission(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                return "I'm missing permissions to Manage Roles. Please give me some and then come back o c o";
            }

            const role_lowercase = role_str.trim().toLowerCase();
            const role = guild.roles.find(r => r.name.toLowerCase() === role_lowercase);
            if (!role) {
                return "The server doesn't have this role :c";
            }

            if (me.highestRole.comparePositionTo(role) <= 0) {
                return "That role is higher than me, so I can't manage it!";
            }
            if (!message.member.hasPermission(Discord.Permissions.FLAGS.ADMINISTRATOR) &&
                message.member.highestRole.comparePositionTo(role) <= 0) {
                return "That role is higher than you!";
            }

            await database_config.updateOne({ guildId: guild.id }, { $set: { enabled: true, roleId: role.id } }, { upsert: true });

            return `:ok_hand: Saved "${role.name}" as the new birthday role!`;
        }));

    birthdayAdminCmd.registerSubCommand("toggle", new SimpleCommand(async message => {
        const guild = message.guild;

        const config_old = await database_config.findOne({ guildId: guild.id }) || { enabled: true };
        await database_config.updateOne({ guildId: guild.id }, { $set: { enabled: !config_old.enabled } }, { upsert: true });

        if (!config_old.enabled) {
            return "Birthday announcing is now enabled in this server";
        } else {
            return "Birthday announcing is now disabled in this server";
        }
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Toggle the birthday announcer on or off"));

    birthdayAdminCmd.registerDefaultCommand(new SimpleCommand(async message => {
        const config = await database_config.findOne({ guildId: message.guild.id });
        if (!config) {
            return basicEmbed("Birthday Config", message.guild)
                .addField("Enabled", "false", true)
                .addField("Role", "none", true);
        }

        const role = message.guild.roles.get(config.roleId);
        if (!role) {
            return basicEmbed("Birthday Config", message.guild)
                .addField("Enabled", !!config.enabled, true)
                .addField("Role", "none", true);
        }

        return basicEmbed("Birthday Config", message.guild)
            .addField("Enabled", !!config.enabled, true)
            .addField("Role", role.name, true);
    }));
};
