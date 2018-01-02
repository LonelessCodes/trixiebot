const discord = require("./keys/discord.json");
const log = require("./modules/log");
const Discord = require("discord.js");
const p = require("./package.json");

const client = new Discord.Client();

client.on("ready", () => {
    log("I am ready");

    client.user.setStatus("online");
    client.user.setGame("!trixie for help");
});

const prefix = "!trixie";

const usage = `\`${prefix}\` to get this help message.

__**Derpibooru**__
Usage: \`!db <?amount> <order:first|latest|top|random> <query>\`
\`amount\` - optional - number ranging from 1 to 5 for how many results to return
\`order\` - string of either \`first, latest, top\` or \`random\`
\`query\` - a query string. Uses Derpibooru's syntax (<https://derpibooru.org/search/syntax>)

__**E621**__
Usage: \`!e621 <?amount> <order:latest> <query>\`
\`amount\` - optional - number ranging from 1 to 5 for how many results to return
\`order\` - string of either \`latest\`
\`query\` - a query string. Uses E621's syntax (<https://e621.net/help/show/tags>)

__**Roles**__
Usage: \`!selfrole <role>\` to add
\`role\` - The role you would like to have added

Usage: \`!selfrole remove <role>\` to remove
\`role\` - The role you would like to have removed

*TrixieBot v${p.version}*`;

client.on("message", async message => {
    if (message.author.bot) return;
    
    // ping pong
    if (message.content === "!ping" || message.content === `${prefix} ping`) {
        const m = await message.channel.send("pong! Wee hehe");
        m.edit("pong! Wee hehe\n" +
            `:stopwatch: \`Latency is ${m.createdTimestamp - message.createdTimestamp}ms\`\n` +
            `:heartbeat: \`API Latency is ${Math.round(client.ping)}ms\``);
    }
    else if (message.content === prefix) {
        message.channel.send(usage);
    }
});

require("./modules/selfrole")(client);
require("./modules/derpi")(client);
require("./modules/e621")(client);

client.login(discord.token);
