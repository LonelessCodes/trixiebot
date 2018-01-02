const log = require("./log");

const available_roles = {
    "Other": [
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

const usage = `Usage: \`!selfrole <role>\`
\`role\` - The role you would like to have added

Usage: \`!selfrole remove <role>\`
\`role\` - The role you would like to have removed`;

const onmessage = async message => {
    if (message.author.bot) return;

    let text = message.content.toLowerCase();
    if (text.startsWith("!selfrole remove") ||
        text.startsWith("!trixie selfrole remove")) {
        while (/\ \ /g.test(text)) text = text.replace(/\ \ /g, " "); // remove double spaces
        let role = text.replace("!selfrole remove", "").replace("!trixie selfrole remove", "");
        if (role === "") {
            message.channel.send(usage);
            return;
        }
        role = role.substring(1);

        if (!roles_array[role]) {
            message.channel.send("Hmm... I couldn't really find your role. Check that again");
            return;
        }

        const role_obj = message.guild.roles.find("name", roles_array[role]);
        if (!role_obj) {
            message.channel.send("Uh apparently this server doesn't have this role available right now.");
            return;
        }

        if (!message.member.roles.has(role_obj.id)) {
            message.channel.send("Can't remove a role without having it first.");
            return;
        }

        await message.member.removeRole(role_obj);
        message.channel.send("Role removed.");
        log(`Removed role ${roles_array[role]} from user ${message.member.user.username}`);
    }
    else if (text.startsWith("!selfrole") ||
        text.startsWith("!trixie selfrole")) {
        while (/\ \ /g.test(text)) text = text.replace(/\ \ /g, " "); // remove double spaces
        let role = text.replace("!selfrole", "").replace("!trixie selfrole", "");
        if (role === "") {
            message.channel.send(usage);
            return;
        }
        role = role.substring(1);

        if (!roles_array[role]) {
            message.channel.send("Hmm... I couldn't really find your role. Here's a list of available ones:\n" + roles_message);
            return;
        }

        const role_obj = message.guild.roles.find("name", roles_array[role]);
        if (!role_obj) {
            message.channel.send("Uh apparently this server doesn't have this role available right now.");
            return;
        }

        if (message.member.roles.has(role_obj.id)) {
            message.channel.send("You already have this role! Yay?");
            return;
        }

        await message.member.addRole(role_obj);
        message.channel.send("Role added! /)");
        log(`Added role ${roles_array[role]} to user ${message.member.user.username}`);
    }
};

function init(client) {
    client.on("message", message => onmessage(message).catch(err => {
        log(err);
        message.channel.send("Uh... I... uhm I think... I might have run into a problem there...? It's not your fault, though...");
    }));
}

module.exports = init;
