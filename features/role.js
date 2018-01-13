const log = require("../modules/log");
const Discord = require("discord.js");
const Command = require("../modules/Command");

const available_roles = {
    "Artist Stuff": [
        "artist",
        "Commissions Open"
    ],
    "Conventions/Meetups": [
        "GalaCon 2018",
        "DerpyFest 2018"
    ]
};

let roles_message = "";
for (let category in available_roles) {
    roles_message += `__**${category}**__\n`;
    roles_message += "```\n";
    for (let role of available_roles[category])
        roles_message += `${role}\n`;
    roles_message += "```\n";
}

const roles_array = {};
for (let category in available_roles)
    for (let role of available_roles[category])
        roles_array[role.toLowerCase()] = role;

const command = new Command(async function onmessage(message) {
    if (/^!role remove\b/.test(message.content)) {
        const msg = message.content.trim().split(/ +/g).join(" ").substr(13);
        if (msg === "") {
            await message.channel.send(this.usage);
            log("Sent role remove usage");
            return;
        }

        const members = message.mentions.members.array();
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
        if (members.length > 0) {
            if (!permission) {
                await message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Remove-Role-From-Somebody-Else. To use the role command you must have permissions to manage roles.");
                log("Grafully aborted attempt to remove role from somebody else without the required permissions");
                return;
            }

            let role = msg;

            for (const member of members) {
                if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                    await message.channel.send("You cannot add roles to other users with Manage Roles permission.");
                    log("Gracefully aborted attempt to remove role from somebody else with permission to manage roles");
                    return;
                }
                role = role.replace(member.toString(), "");
            }
            role = role.trim();

            const role_obj = message.guild.roles.find("name", role);
            if (!role_obj) {
                await message.channel.send("Uh apparently this server doesn't have this role available right now.");
                log(`Couldn't find role ${role} in server ${message.guild.name}`);
                return;
            }

            for (const member of members) {
                member.removeRole(role_obj);
            }
            await message.channel.send("Role removed.");
            log(`Removed role ${role} from users ${members.map(member => member.toString()).join(" ")}`);
        } else {
            if (!roles_array[msg.toLowerCase()] &&!permission) {
                await message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Remove-Role-From-Somebody-Else. To use the role command you must have permissions to manage roles.");
                log("Grafully aborted attempt to remove role without the required permissions");
                return;
            }
            const role = permission ? msg : roles_array[msg.toLowerCase()];
            if (!role) {
                await message.channel.send("Hmm... I couldn't really find your role. Check that again");
                log(`Couldn't find role ${role} in predefined sets`);
                return;
            }

            const role_obj = message.guild.roles.find("name", role);
            if (!role_obj) {
                await message.channel.send("Uh apparently this server doesn't have this role available right now.");
                log(`Couldn't find role ${role} in guild ${message.guild.name}`);
                return;
            }

            if (!message.member.roles.has(role_obj.id)) {
                message.channel.send("Can't remove a role without having it first.");
                log("Couldn't remove role. User didn't have role in the first place");
                return;
            }

            await message.member.removeRole(role_obj);
            await message.channel.send("Role removed.");
            log(`Removed role ${role} from user ${message.member.user.username}`);
        }
    }
    else if (/^!role\b/.test(message.content)) {
        const msg = message.content.trim().split(/ +/g).join(" ").substr(6);
        if (msg === "") {
            await message.channel.send(this.usage);
            log("Sent role usage");
            return;
        }

        const members = message.mentions.members.array();
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
        if (members.length > 0) {
            const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
            if (!permission) {
                await message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Add-Role-To-Somebody-Else. To use the role command you must have permissions to manage roles.");
                log("Gracefully aborted attempt to add role to another user without having the required permissions");
                return;
            }

            let role = msg;

            for (const member of members) {
                if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                    await message.channel.send("You cannot add roles to other users with Manage Roles permission.");
                    log("Gracefully aborted attempt to add role to another user that has permissions to manage roles themselves");
                    return;
                }
                role = role.replace(member.toString(), "");
            }
            role = role.trim();

            const role_obj = message.guild.roles.find("name", role);
            if (!role_obj) {
                await message.channel.send("Uh apparently this server doesn't have this role available right now.");
                log(`Couldn't find role ${role} in guild ${message.guild.name}`);
                return;
            }

            for (const member of members) {
                await member.addRole(role_obj);
            }
            await message.channel.send("Role added! /)");
            log(`Added role ${role} to users ${members.map(member => member.toString()).join(" ")}`);
        } else {
            if (!roles_array[msg.toLowerCase()] &&!permission) {
                await message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Remove-Role-From-Somebody-Else. To use the role command you must have permissions to manage roles.");
                log("Gracefully aborted attempt to add role without having the required permissions");
                return;
            }
            const role = permission ? msg : roles_array[msg.toLowerCase()];
            if (!role) {
                await message.channel.send("Hmm... I couldn't really find your role. Here's a list of available ones:\n" + roles_message);
                log(`Couldn't find role ${role} in presets`);
                return;
            }

            const role_obj = message.guild.roles.find("name", role);
            if (!role_obj) {
                await message.channel.send("Uh apparently this server doesn't have this role available right now.");
                log(`Couldn't find role ${role} in guild ${message.guild.name}`);
                return;
            }

            if (message.member.roles.has(role_obj.id)) {
                await message.channel.send("You already have this role! Yay?");
                log("Couldn't add role: already has role");
                return;
            }

            await message.member.addRole(role_obj);
            await message.channel.send("Role added! /)");
            log(`Added role ${role} to user ${message.member.user.username}`);
        }
    }
}, {
    usage: `\`!role <role> <?user mention 1> <?user mention 2> ...\` to add
\`role\` - The role you would like to have added
\`user mention\` - this is irrelevant to you, if you don't have rights to manage roles yourself.

\`!role remove <role> <?user mention 1> <?user mention 2> ...\` to remove
\`role\` - The role you would like to have removed
\`user mention\` - this is irrelevant to you, if you don't have rights to manage roles yourself.`,
    ignore: true
});

module.exports = command;
