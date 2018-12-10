const log = require("../modules/log");
const { findArgs } = require("../modules/string_utils");
const Discord = require("discord.js");

const AliasCommand = require("../class/AliasCommand");
const TreeCommand = require("../class/TreeCommand");
const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");
const CommandPermission = require("../logic/commands/CommandPermission");

function findRoleInServer(guild, role) {
    const role_lower_case = role.toLowerCase();
    return guild.roles.find(role_obj => role_obj.name.toLowerCase() === role_lower_case);
}

async function rolesMessage(guild, channel, db) {
    const roles = await db.find({
        guildId: guild.id
    }).toArray();

    const available_roles = new Map;
    for (const role of roles) {
        let role_obj = guild.roles.get(role.roleId);
        if (!role_obj) continue;

        role.category = role.category || await channel.translate("Other");
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
            roles_message += role.name + new Array((maxLength - role.name.length) + 1 + (numberLength - role.members.size.toString().length)).fill(" ").join("") + role.members.size + " members\n";
        }
        
        roles_message += "```\n";
    }
    
    if (roles_message === "") {
        return await channel.translate("This server doesn't have any publicly available roles :/");
    } else {
        return await channel.translate("Here's a list of available roles:") + "\n" + roles_message;
    }
}

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("roles");

    const roleCommand = cr.register("role", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("A whole easy to use role manager. Configure roles everyone can add themselves.")
            .setUsage("<role> <?user mention 1> <?user mention 2> ...", "to add roles")
            .addParameter("role", "The role you would like to have added")
            .addParameterOptional("user mention", "this is irrelevant to you, if you don't have rights to manage roles yourself"))
        .setCategory(Category.UTILS);

    /*
     * SUB COMMANDS
     */

    roleCommand.registerSubCommand("remove", new class extends BaseCommand {
        async call(message, content) {
            if (content === "") {
                return;
            }

            const members = message.mentions.members.array();
            const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
            if (members.length > 0) {
                if (!permission) {
                    await message.channel.sendTranslated("IDK what you're doing here, Mister. To use the role command you must have permissions to manage roles.");
                    log("Grafully aborted attempt to remove role from somebody else without the required permissions");
                    return;
                }

                for (const member of members) {
                    if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                        await message.channel.sendTranslated("You cannot remove roles from other users with Manage Roles permission.");
                        log("Gracefully aborted attempt to remove role from somebody else with permission to manage roles");
                        return;
                    }
                    content = content.replace(member.toString(), "");
                }
                content = content.trim();

                const role_obj = findRoleInServer(message.guild, content);
                if (!role_obj) {
                    await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                    log(`Couldn't find role ${content} in server ${message.guild.name}`);
                    return;
                }

                for (const member of members) {
                    member.removeRole(role_obj);
                }
                await message.channel.sendTranslated("Role removed.");
                log(`Removed role ${role_obj.name} from users ${members.map(member => member.toString()).join(" ")}`);
            } else {
                if (permission) {
                    const role_obj = findRoleInServer(message.guild, content);
                    if (!role_obj) {
                        await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                        log(`Couldn't find role ${content} in guild ${message.guild.name}`);
                        return;
                    }

                    if (!message.member.roles.has(role_obj.id)) {
                        message.channel.sendTranslated("Can't remove a role without having it first.");
                        log("Couldn't remove role. User didn't have role in the first place");
                        return;
                    }

                    await message.member.removeRole(role_obj);
                    await message.channel.sendTranslated("Role removed.");
                    log(`Removed role ${role_obj.name} from user ${message.member.user.username}`);
                } else {
                    const role_obj = findRoleInServer(message.guild, content);
                    if (!role_obj) {
                        await message.channel.send(await message.channel.translate("This role doesn't exist so you can't have it.") + " " + await rolesMessage(message.guild, message.channel, database));
                        log(`Couldn't find role ${content} in server ${message.guild.name}`);
                        return;
                    }

                    const role_query = await database.findOne({
                        guildId: message.guild.id,
                        roleId: role_obj.id
                    });

                    if (!role_query) {
                        await message.channel.send(await message.channel.translate("You don't have permission to remove this role.") + " " + await rolesMessage(message.guild, message.channel, database));
                        log(`Couldn't remove role ${role_obj.name}. Not in presets, aka no permission`);
                        return;
                    }

                    if (!message.member.roles.has(role_obj.id)) {
                        message.channel.sendTranslated("Can't remove a role without having it first.");
                        log("Couldn't remove role. User didn't have role in the first place");
                        return;
                    }

                    await message.member.removeRole(role_obj);
                    await message.channel.sendTranslated("Role removed.");
                    log(`Removed role ${role_obj.name} from user ${message.member.user.username}`);
                }
            }
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<role> <?user mention 1> <?user mention 2> ...", "to remove")
            .addParameter("role", "The role you would like to have removed")
            .addParameter("user mention", "This is irrelevant to you, if you don't have rights to manage roles yourself"));

    const listRoles = new class extends BaseCommand {
        get help() {
            return new HelpContent().setUsage("", "Show all public roles that you can add to yourself.");
        }
        async call(message) {
            await message.channel.send(await rolesMessage(message.guild, message.channel, database));
            log(`Requested available roles for guild ${message.guild.name}`);
        }
    };
    roleCommand.registerSubCommand("available", listRoles);
    cr.register("roles", new AliasCommand("role", listRoles));

    const roleConfig = roleCommand.registerSubCommand("config", new TreeCommand)
        .setPermissions(new CommandPermission.CommandPermission([Discord.Permissions.FLAGS.MANAGE_ROLES]))
        .setHelp(new HelpContent()
            .setUsageTitle("Admin Area")
            .setUsage("", "Configure roles that everyone can add"));
    roleConfig.registerSubCommand("add", new class extends BaseCommand {
        async call(message, content) {
            const args = findArgs(content);
            const role_query = args[0];
            const category = args[1] || undefined;

            const role_obj = findRoleInServer(message.guild, role_query);
            if (!role_obj) {
                await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                log(`Couldn't find role ${role_query} in server ${message.guild.name}`);
                return;
            }

            const compare = role_obj.comparePositionTo(message.member.highestRole);
            if (compare > 0) {
                await message.channel.sendTranslated("Sorry, you can't add a role to the config that is more powerful than your owns.");
                log(`Couldn't add role ${role_query} to config. Role too high`);
                return;
            }

            await database.updateOne({
                guildId: message.guild.id,
                roleId: role_obj.id
            }, {
                $set: {
                    category
                }
            }, { upsert: true });
            await message.channel.sendTranslated("Made the role available for everyone! It's free real estate");
            log(`Added role ${role_query} to config of guild ${message.guild.name}`);
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<role> <?category>", "Add a role to the public configuration"));
    roleConfig.registerSubCommand("remove", new class extends BaseCommand {
        async call(message, content) {
            const args = findArgs(content);
            const role = args[0];

            const role_obj = message.guild.roles.find("name", role);
            if (!role_obj) {
                await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                log(`Couldn't find role ${role} in server ${message.guild.name}`);
                return;
            }

            const compare = role_obj.comparePositionTo(message.member.highestRole);
            if (compare > 0) {
                await message.channel.sendTranslated("Sorry, you can't remove a role to the config that is more powerful than your owns.");
                log(`Couldn't remove role ${role} to config. Role too high`);
                return;
            }

            await database.deleteOne({
                guildId: message.guild.id,
                roleId: role_obj.id
            });
            await message.channel.sendTranslated("Removed the role from the config. Ouchie wouchie ;~;");
            log(`Removed role ${role} from config of guild ${message.guild.name}`);
        }
    })
        .setHelp(new HelpContent()
            .setUsage("<role>", "Remove a role from the public configuration")
            .addParameter("role", "The \"quoted\" role name of the role you want to remove")
            .addParameterOptional("category", "The \"quoted\" name of the category you want to add the role to. Not given will be \"Other\""));

    roleCommand.registerDefaultCommand(new class extends BaseCommand {
        async call(message, content) {
            // if no role name return the usage
            if (content === "") {
                return;
            }

            // get all mentions
            const members = message.mentions.members.array();
            // check permission of author
            const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
            // if there are mentions perform action to add roles to other users
            if (members.length > 0) {
                // adding roles to others requires manage roles permission
                const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
                if (!permission) {
                    await message.channel.sendTranslated("IDK what you're doing here, Mister. To use the role command you must have permissions to manage roles.");
                    log("Gracefully aborted attempt to add role to another user without having the required permissions");
                    return;
                }

                // check permissions of users mentioned and remove their id string from msg to get the role name in the end
                for (const member of members) {
                    if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                        await message.channel.sendTranslated("You cannot add roles to other users with Manage Roles permission.");
                        log("Gracefully aborted attempt to add role to another user that has permissions to manage roles themselves");
                        return;
                    }
                    content = content.replace(member.toString(), "");
                }
                content = content.trim();

                // see if role is available
                const role_obj = findRoleInServer(message.guild, content);
                if (!role_obj) {
                    await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                    log(`Couldn't find role ${content} in guild ${message.guild.name}`);
                    return;
                }

                // add the role
                for (const member of members) {
                    await member.addRole(role_obj);
                }
                await message.channel.sendTranslated("Role added! /)");
                log(`Added role ${role_obj.name} to users ${members.map(member => member.toString()).join(" ")}`);
            } else {
                if (permission) {
                    const role_obj = findRoleInServer(message.guild, content);
                    if (!role_obj) {
                        await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                        log(`Couldn't find role ${content} in server ${message.guild.name}`);
                        return;
                    }

                    if (message.member.roles.has(role_obj.id)) {
                        await message.channel.sendTranslated("You already have this role! Yay?");
                        log("Couldn't add role: already has role");
                        return;
                    }

                    await message.member.addRole(role_obj);
                    await message.channel.sendTranslated("Role added! /)");
                    log(`Added role ${role_obj.name} to user ${message.member.user.username}`);
                } else {
                    const role_obj = findRoleInServer(message.guild, content);
                    if (!role_obj) {
                        await message.channel.send(await message.channel.translate("Uh apparently this server doesn't have this role available right now.") + " " + await rolesMessage(message.guild, message.channel, database));
                        log(`Couldn't find role ${content} in server ${message.guild.name}`);
                        return;
                    }

                    const role_query = await database.findOne({
                        guildId: message.guild.id,
                        roleId: role_obj.id
                    });

                    if (!role_query) {
                        await message.channel.send(await message.channel.translate("Hmm... I couldn't really find your role.") + " " + await rolesMessage(message.guild, message.channel, database));
                        log(`Couldn't find role ${role_obj.name} in presets`);
                        return;
                    }

                    if (message.member.roles.has(role_obj.id)) {
                        await message.channel.sendTranslated("You already have this role! Yay?");
                        log("Couldn't add role: already has role");
                        return;
                    }

                    await message.member.addRole(role_obj);
                    await message.channel.sendTranslated("Role added! /)");
                    log(`Added role ${content} to user ${message.member.user.username}`);
                }
            }
        }
    });
    roleCommand.registerSubCommandAlias("*", "add");
};