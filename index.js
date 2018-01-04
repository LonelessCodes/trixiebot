const discord = require("./keys/discord.json");
const log = require("./modules/log");
const Discord = require("discord.js");
const p = require("./package.json");
const fliptext = require("flip-text");

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

__**Trash**__
Usage: \`!fuck <user>\`
\`user\` - the username of the user to fuck

\`!fuck add <text>\`
\`text\` - the text the bot is supposed to say. It must contain \`\${name}\` in the place the username should be set.
           E.g.: \`!fuck add rides \${name}'s skin bus into tuna town\`

*TrixieBot v${p.version}*`;

client.on("message", async message => {
    if (message.author.bot) return;
    if (message.channel.type !== "text") return;
    
    // ping pong
    if (message.content.toLowerCase() === "!ping" || message.content.toLowerCase() === `${prefix} ping`) {
        const m = await message.channel.send("pong! Wee hehe");
        m.edit("pong! Wee hehe\n" +
            `:stopwatch: \`Latency is ${m.createdTimestamp - message.createdTimestamp}ms\`\n` +
            `:heartbeat: \`API Latency is ${Math.round(client.ping)}ms\``);
    }
    else if (message.content.toLowerCase() === prefix) {
        message.channel.send(usage);
    }

    if (message.content.toLowerCase() === "!tableflip" || message.content.toLowerCase() === "!tf") {
        message.channel.send("(╯°□°）╯︵ ┻━┻");
        log("Flipped table successfully!!!");
    }

    if (/\!flip/i.test(message.content)) {
        const mention = message.mentions.members.first();
        if (!mention) {
            message.channel.send("Usage: `!flip <user>`");
            return;
        }
        message.channel.send(`(╯°□°）╯︵ ${fliptext(mention.displayName)}`);
        log(`Flipped ${mention.user.username}`);
    }
});

require("./modules/selfrole")(client);
require("./modules/fuck")(client);
require("./modules/derpi")(client);
require("./modules/e621")(client);

client.login(discord.token);
