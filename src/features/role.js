const log = require("../modules/log");
const locale = require("../logic/Locale");
const { findArgs } = require("../modules/util");
const Discord = require("discord.js");
const Command = require("../class/Command");

async function rolesMessage(guild, channel, db) {
    const roles = await db.find({
        guildId: guild.id
    }).toArray();

    const available_roles = {};
    for (const role of roles) {
        let role_obj = guild.roles.get(role.roleId);
        if (!role_obj) continue;

        role.category = role.category || await channel.translate("Other");
        if (!available_roles[role.category])
            available_roles[role.category] = [];
        available_roles[role.category].push(role_obj);
    }

    let roles_message = "";
    for (const category in available_roles) {
        roles_message += `__**${category}**__\n`;
        roles_message += "```\n";
        for (const role of available_roles[category])
            roles_message += `${role.name}\n`;
        roles_message += "```\n";
    }
    
    if (roles_message === "") {
        return await channel.translate("This server doesn't have any publicly available roles :/");
    } else {
        return await channel.translate("Here's a list of available roles:") + "\n" + roles_message;
    }
}

class RoleCommand extends Command {
    constructor(client, config, db) {
        super(client, config);
        this.db = db.collection("roles");
    }
    async onmessage(message) {
        if (!message.prefixUsed) return;

        if (/^role config\b/i.test(message.content)) {
            // ADMIN AREA
            const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
            if (!permission) {
                await message.channel.sendTranslated("IDK what you're doing here");
                log("Grafully aborted attempt to config roles without the required permissions");
                return;
            }

            let msg = message.content.substr(12);

            if (/^add\b/i.test(msg)) {
                msg = msg.substr(4);
                const args = findArgs(msg);
                const role = args[0];
                const category = args[1] || undefined;
                
                const role_obj = message.guild.roles.find("name", role);
                if (!role_obj) {
                    await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                    log(`Couldn't find role ${role} in server ${message.guild.name}`);
                    return;
                }

                const compare = role_obj.comparePositionTo(message.member.highestRole);
                if (compare > 0) {
                    await message.channel.sendTranslated("Sorry, you can't add a role to the config that is more powerful than your owns.");
                    log(`Couldn't add role ${role} to config. Role too high`);
                    return;
                }

                await this.db.updateOne({
                    guildId: message.guild.id,
                    roleId: role_obj.id
                }, {
                    $set: {
                        category
                    }
                }, { upsert: true });
                await message.channel.sendTranslated("Made the role available for everyone! It's free real estate");
                log(`Added role ${role} to config of guild ${message.guild.name}`);
                return;
            }

            if (/^remove\b/i.test(msg)) {
                msg = msg.substr(7);
                const args = findArgs(msg);
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

                await this.db.deleteOne({
                    guildId: message.guild.id,
                    roleId: role_obj.id
                });
                await message.channel.sendTranslated("Removed the role from the config. Ouchie wouchie ;~;");
                log(`Removed role ${role} from config of guild ${message.guild.name}`);
                return;
            }

            return;
        }
        
        if (/^role remove\b/i.test(message.content)) {
            const msg = message.content.substr(12);
            if (msg === "") {
                await message.channel.send(this.usage(message.prefix));
                log("Sent role remove usage");
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

                let role = msg;

                for (const member of members) {
                    if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                        await message.channel.sendTranslated("You cannot remove roles from other users with Manage Roles permission.");
                        log("Gracefully aborted attempt to remove role from somebody else with permission to manage roles");
                        return;
                    }
                    role = role.replace(member.toString(), "");
                }
                role = role.trim();

                const role_obj = message.guild.roles.find("name", role);
                if (!role_obj) {
                    await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                    log(`Couldn't find role ${role} in server ${message.guild.name}`);
                    return;
                }

                for (const member of members) {
                    member.removeRole(role_obj);
                }
                await message.channel.sendTranslated("Role removed.");
                log(`Removed role ${role} from users ${members.map(member => member.toString()).join(" ")}`);
            } else {
                let role = msg;

                if (permission) {
                    const role_obj = message.guild.roles.find("name", role);
                    if (!role_obj) {
                        await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                        log(`Couldn't find role ${role} in guild ${message.guild.name}`);
                        return;
                    }

                    if (!message.member.roles.has(role_obj.id)) {
                        message.channel.sendTranslated("Can't remove a role without having it first.");
                        log("Couldn't remove role. User didn't have role in the first place");
                        return;
                    }

                    await message.member.removeRole(role_obj);
                    await message.channel.sendTranslated("Role removed.");
                    log(`Removed role ${role} from user ${message.member.user.username}`);
                } else {
                    const role_obj = message.guild.roles.find("name", role);
                    if (!role_obj) {
                        await message.channel.send(await message.channel.translate("This role doesn't exist so you can't have it.") + " " + await rolesMessage(message.guild, message.channel, this.db));
                        log(`Couldn't find role ${role} in server ${message.guild.name}`);
                        return;
                    }

                    const role_query = await this.db.findOne({
                        guildId: message.guild.id,
                        roleId: role_obj.id
                    });

                    if (!role_query) {
                        await message.channel.send(await message.channel.translate("You don't have permission to remove this role.") + " " + await rolesMessage(message.guild, message.channel, this.db));
                        log(`Couldn't remove role ${role}. Not in presets, aka no permission`);
                        return;
                    }

                    if (!message.member.roles.has(role_obj.id)) {
                        message.channel.sendTranslated("Can't remove a role without having it first.");
                        log("Couldn't remove role. User didn't have role in the first place");
                        return;
                    }
    
                    await message.member.removeRole(role_obj);
                    await message.channel.sendTranslated("Role removed.");
                    log(`Removed role ${role} from user ${message.member.user.username}`);
                }
            }

            return;
        }
        
        if (/^role available\b/i.test(message.content)) {
            await message.channel.send(await rolesMessage(message.guild, message.channel, this.db));
            log(`Requested available roles for guild ${message.guild.name}`);
            return;
        }
        
        if (/^role\b/i.test(message.content)) {
            // get the role name
            let msg;
            if (/^role add\b/i.test(message.content)) {
                msg = message.content.substr(9);
            } else {
                msg = message.content.substr(5);
            }

            // if no role name return the usage
            if (msg === "") {
                await message.channel.send(this.usage(message.prefix));
                log("Sent role usage");
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

                let role = msg;
                // check permissions of users mentioned and remove their id string from msg to get the role name in the end
                for (const member of members) {
                    if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                        await message.channel.sendTranslated("You cannot add roles to other users with Manage Roles permission.");
                        log("Gracefully aborted attempt to add role to another user that has permissions to manage roles themselves");
                        return;
                    }
                    role = role.replace(member.toString(), "");
                }
                role = role.trim();

                // see if role is available
                const role_obj = message.guild.roles.find("name", role);
                if (!role_obj) {
                    await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                    log(`Couldn't find role ${role} in guild ${message.guild.name}`);
                    return;
                }

                // add the role
                for (const member of members) {
                    await member.addRole(role_obj);
                }
                await message.channel.sendTranslated("Role added! /)");
                log(`Added role ${role} to users ${members.map(member => member.toString()).join(" ")}`);
            } else {
                let role = msg;
                if (permission) {
                    const role_obj = message.guild.roles.find("name", role);
                    if (!role_obj) {
                        await message.channel.sendTranslated("Uh apparently this server doesn't have this role available right now.");
                        log(`Couldn't find role ${role} in server ${message.guild.name}`);
                        return;
                    }

                    if (message.member.roles.has(role_obj.id)) {
                        await message.channel.sendTranslated("You already have this role! Yay?");
                        log("Couldn't add role: already has role");
                        return;
                    }
    
                    await message.member.addRole(role_obj);
                    await message.channel.sendTranslated("Role added! /)");
                    log(`Added role ${role} to user ${message.member.user.username}`);
                } else {
                    const role_obj = message.guild.roles.find("name", role);
                    if (!role_obj) {
                        await message.channel.send(await message.channel.translate("Uh apparently this server doesn't have this role available right now.") + " " + await rolesMessage(message.guild, message.channel, this.db));
                        log(`Couldn't find role ${role} in server ${message.guild.name}`);
                        return;
                    }

                    const role_query = await this.db.findOne({
                        guildId: message.guild.id,
                        roleId: role_obj.id
                    });

                    if (!role_query) {
                        await message.channel.send(await message.channel.translate("Hmm... I couldn't really find your role.") + " " + await rolesMessage(message.guild, message.channel, this.db));
                        log(`Couldn't find role ${role} in presets`);
                        return;
                    }

                    if (message.member.roles.has(role_obj.id)) {
                        await message.channel.sendTranslated("You already have this role! Yay?");
                        log("Couldn't add role: already has role");
                        return;
                    }
    
                    await message.member.addRole(role_obj);
                    await message.channel.sendTranslated("Role added! /)");
                    log(`Added role ${role} to user ${message.member.user.username}`);
                }
            }

            return;
        }
    }

    get guildOnly() { return true; }
    
    usage(prefix) {
        return `\`${prefix}role <role> <?user mention 1> <?user mention 2> ...\` to add (alias \`${prefix}role add\`)
\`role\` - The role you would like to have added
\`user mention\` - this is irrelevant to you, if you don't have rights to manage roles yourself.

\`${prefix}role remove <role> <?user mention 1> <?user mention 2> ...\` to remove
\`role\` - The role you would like to have removed
\`user mention\` - this is irrelevant to you, if you don't have rights to manage roles yourself.`;
    }
}

module.exports = RoleCommand;
