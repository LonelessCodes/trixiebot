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

const { findArgs } = require("../util/string");
const Discord = require("discord.js");

const AliasCommand = require("../core/commands/AliasCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");

const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandPermission = require("../util/commands/CommandPermission");

const Translation = require("../modules/i18n/Translation");
const TranslationMerge = require("../modules/i18n/TranslationMerge");

function findRoleInServer(guild, role) {
    const role_lower_case = role.toLowerCase();
    return guild.roles.find(role_obj => role_obj.name.toLowerCase() === role_lower_case);
}

async function rolesMessage(guild, channel, db) {
    const roles = await db.find({
        guildId: guild.id,
    }).toArray();

    const available_roles = new Map;
    for (const role of roles) {
        let role_obj = guild.roles.get(role.roleId);
        if (!role_obj) continue;

        role.category = role.category || "Other";
        if (!available_roles.has(role.category))
            available_roles.set(role.category, []);
        available_roles.get(role.category).push(role_obj);
    }

    let roles_message = "";
    for (const [category, roles] of available_roles) {
        roles_message += `__**${category}**__\n`;
        roles_message += "```\n";

        let maxLength = 0;
        let numberLength = 0;
        for (const role of roles) {
            let n = role.members.size.toString().length;
            if (numberLength < n)
                numberLength = n;
            if (maxLength < role.name.length)
                maxLength = role.name.length;
        }

        for (const role of roles) {
            roles_message += role.name + new Array(
                (maxLength - role.name.length) + 1 + (numberLength - role.members.size.toString().length)
            ).fill(" ").join("") + role.members.size + " members\n";
        }

        roles_message += "```\n";
    }

    if (roles_message === "") {
        return new Translation("role.no_roles", "This server doesn't have any publicly available roles :/");
    } else {
        return new TranslationMerge(
            new Translation("role.all_roles", "Here's a list of available roles:"),
            "\n" + roles_message
        );
    }
}

module.exports = function install(cr, { db }) {
    const database = db.collection("roles");

    const roleCommand = cr.registerCommand("role", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("A whole easy to use role manager. Configure roles everyone can add themselves.")
            .setUsage("<role> <?user mention 1> <?user mention 2> ...", "to add roles")
            .addParameter("role", "The role you would like to have added")
            .addParameterOptional("user mention", "this is irrelevant to you, if you don't have rights to manage roles yourself"))
        .setCategory(Category.UTILS);

    /*
     * SUB COMMANDS
     */

    roleCommand.registerSubCommand("remove", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const members = message.mentions.members.array();
            const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
            if (members.length > 0) {
                if (!permission) {
                    return new Translation(
                        "role.no_permissions",
                        "IDK what you're doing here, Mister. To use the role command on other users you must have permissions to manage roles."
                    );
                }

                for (const member of members) {
                    if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                        return new Translation("role.no_remove_other_mods", "You cannot remove roles from other users with Manage Roles permission.");
                    }
                    content = content.replace(member.toString(), "");
                }
                content = content.trim();

                const role_obj = findRoleInServer(message.guild, content);
                if (!role_obj) {
                    return new Translation("role.not_available", "Uh apparently this server doesn't have this role available right now.");
                }

                for (const member of members) {
                    member.removeRole(role_obj);
                }
            } else if (permission) {
                const role_obj = findRoleInServer(message.guild, content);
                if (!role_obj) {
                    return new Translation("role.not_available", "Uh apparently this server doesn't have this role available right now.");
                }

                if (!message.member.roles.has(role_obj.id)) {
                    return new Translation("role.cant_remove", "Can't remove a role without having it first.");
                }

                await message.member.removeRole(role_obj);
            } else {
                const role_obj = findRoleInServer(message.guild, content);
                if (!role_obj) {
                    return new TranslationMerge(
                        new Translation("role.remove_no_exist", "This role doesn't exist so you can't have it."),
                        await rolesMessage(message.guild, message.channel, database)
                    );
                }

                const role_query = await database.findOne({
                    guildId: message.guild.id,
                    roleId: role_obj.id,
                });

                if (!role_query) {
                    return new TranslationMerge(
                        new Translation("role.remove_no_perms", "You don't have permission to remove this role."),
                        await rolesMessage(message.guild, message.channel, database)
                    );
                }

                if (!message.member.roles.has(role_obj.id)) {
                    return new Translation("role.cant_remove", "Can't remove a role without having it first.");
                }

                await message.member.removeRole(role_obj);
            }

            return new Translation("role.removed", "Role removed.");
        }))
        .setHelp(new HelpContent()
            .setUsage("<role> <?user mention 1> <?user mention 2> ...", "to remove")
            .addParameter("role", "The role you would like to have removed")
            .addParameter("user mention", "This is irrelevant to you, if you don't have rights to manage roles yourself"));

    const listRoles = roleCommand.registerSubCommand("available", new SimpleCommand(async message =>
        await rolesMessage(message.guild, message.channel, database)
    ))
        .setHelp(new HelpContent().setUsage("", "Show all public roles that you can add to yourself."));
    cr.registerCommand("roles", new AliasCommand("role", listRoles));

    const roleConfig = roleCommand.registerSubCommand("config", new TreeCommand)
        .setPermissions(new CommandPermission([Discord.Permissions.FLAGS.MANAGE_ROLES]))
        .setHelp(new HelpContent()
            .setUsageTitle("Admin Area")
            .setUsage("", "Configure roles that everyone can add"));

    roleConfig.registerSubCommand("add", new SimpleCommand(async ({ message, content }) => {
        const args = findArgs(content);
        const role_query = args[0];
        const category = args[1] || undefined;

        const role_obj = findRoleInServer(message.guild, role_query);
        if (!role_obj) {
            return new Translation("role.not_available", "Uh apparently this server doesn't have this role available right now.");
        }

        const compare = role_obj.comparePositionTo(message.member.highestRole);
        if (compare > 0) {
            return new Translation("role.add_perms_conflict", "Sorry, you can't add a role to the config that is more powerful than your owns.");
        }

        await database.updateOne({
            guildId: message.guild.id,
            roleId: role_obj.id,
        }, {
            $set: {
                category,
            },
        }, { upsert: true });

        return new Translation("role.added_config", "Made the role available for everyone! It's free real estate");
    }))
        .setHelp(new HelpContent()
            .setUsage("<role> <?category>", "Add a role to the public configuration"));

    roleConfig.registerSubCommand("remove", new SimpleCommand(async ({ message, content }) => {
        const args = findArgs(content);
        const role = args[0];

        const role_obj = message.guild.roles.find(r => r.name === role);
        if (!role_obj) {
            return new Translation("role.not_available", "Uh apparently this server doesn't have this role available right now.");
        }

        const compare = role_obj.comparePositionTo(message.member.highestRole);
        if (compare > 0) {
            return new Translation("role.remove_perms_conflict", "Sorry, you can't remove a role to the config that is more powerful than your owns.");
        }

        await database.deleteOne({
            guildId: message.guild.id,
            roleId: role_obj.id,
        });

        return new Translation("role.removed_config", "Removed the role from the config. Ouchie wouchie ;~;");
    }))
        .setHelp(new HelpContent()
            .setUsage("<role>", "Remove a role from the public configuration")
            .addParameter("role", "The \"quoted\" role name of the role you want to remove")
            .addParameterOptional("category", "The \"quoted\" name of the category you want to add the role to. Not given will be \"Other\""));

    roleCommand.registerDefaultCommand(new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            // get all mentions
            const members = message.mentions.members.array();
            // check permission of author
            const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
            // if there are mentions perform action to add roles to other users
            if (members.length > 0) {
                // adding roles to others requires manage roles permission
                const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
                if (!permission) {
                    return new Translation(
                        "role.no_permissions",
                        "IDK what you're doing here, Mister. To use the role command on other users you must have permissions to manage roles."
                    );
                }

                // check permissions of users mentioned and remove their id string from msg to get the role name in the end
                for (const member of members) {
                    if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                        return new Translation("role.cannot_add_other_users", "You cannot add roles to other users with Manage Roles permission.");
                    }
                    content = content.replace(member.toString(), "");
                }
                content = content.trim();

                // see if role is available
                const role_obj = findRoleInServer(message.guild, content);
                if (!role_obj) {
                    return new Translation("role.not_available", "Uh apparently this server doesn't have this role available right now.");
                }

                // add the role
                for (const member of members) {
                    await member.addRole(role_obj);
                }
            } else if (permission) {
                const role_obj = findRoleInServer(message.guild, content);
                if (!role_obj) {
                    return new Translation("role.not_available", "Uh apparently this server doesn't have this role available right now.");
                }

                if (message.member.roles.has(role_obj.id)) {
                    return new Translation("role.already_have", "You already have this role! Yay?");
                }

                await message.member.addRole(role_obj);
            } else {
                const role_obj = findRoleInServer(message.guild, content);
                if (!role_obj) {
                    return new TranslationMerge(
                        new Translation("role.not_available", "Uh apparently this server doesn't have this role available right now."),
                        await rolesMessage(message.guild, message.channel, database)
                    );
                }

                const role_query = await database.findOne({
                    guildId: message.guild.id,
                    roleId: role_obj.id,
                });

                if (!role_query) {
                    return new TranslationMerge(
                        new Translation("role.no_role", "Hmm... I couldn't really find your role."),
                        await rolesMessage(message.guild, message.channel, database)
                    );
                }

                if (message.member.roles.has(role_obj.id)) {
                    return new Translation("role.already_have", "You already have this role! Yay?");
                }

                await message.member.addRole(role_obj);
            }

            return new Translation("role.added", "Role added! /)");
        }));
    roleCommand.registerSubCommandAlias("*", "add");

    cr.registerAlias("role", "rank");
    cr.registerAlias("roles", "ranks");
};
