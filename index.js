const discord = require("./keys/discord.json");
const log = require("./modules/log");
const Discord = require("discord.js");
const p = require("./package.json");
const path = require("path");
const fs = require("fs");

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

__**Giphy**__
Usage:
\`!gif <query>\` - returns the top result for the given \`query\`
\`!gif random <query>\` - returns a random gif for the given \`query\`
\`!gif trending\` - returns a random trending gif

__**Roles**__
Usage: \`!selfrole <role>\` to add
\`role\` - The role you would like to have added

Usage: \`!selfrole remove <role>\` to remove
\`role\` - The role you would like to have removed

__**Trash**__
Uberfacts: \`!fact\` gets random UberFacts fact

TTS:
\`!tts <message>\` - joins the user's current voice channel and reads the message out aloud.

Flip a coin: \`!coin <bet>\`
\`bet\` - your bet. Either \`heads\` or \`tails\`

Fuck a user: \`!fuck <user>\`
\`user\` - the username of the user to fuck

\`!fuck add <text>\`
\`text\` - the text the bot is supposed to say. It must contain \`\${name}\` in the place the username should be set.
           E.g.: \`!fuck add rides \${name}'s skin bus into tuna town\`

Flip a user: \`!flip <user>\`
\`user\` - user to flip

\`!unflip <user>\`
\`user\` - user to unflip

Textfaces: \`!face\` returns a random ASCII face

Flip the table:
\`!tableflip\`
\`!untableflip\`

\`!cat\`

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
        return;
    }
    else if (message.content.toLowerCase() === prefix) {
        message.channel.send(usage);
        return;
    }
});

const files = fs.readdirSync("./features");
for (let file of files)
    if (path.extname(file) === ".js")
        require("./features/" + file).init(client);

client.login(discord.token);
