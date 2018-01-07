const log = require("../modules/log");
const sql = require("../modules/database");
const db = new sql.Database("./data/fucks.sqlite");
const Command = require("../modules/Command");

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

const usage = `Usage: \`!fuck <user>\`
\`user\` - the username of the user to fuck

\`!fuck add <text>\`
\`text\` - the text the bot is supposed to say. It must contain \`\${name}\` in the place the username should be set.
           E.g.: \`!fuck add rides \${name}'s skin bus into tuna town\``;

const added_recently = new Array();

const command = new Command(async message => {
    if (message.author.bot) return;
    if (message.channel.type !== "text") return;

    if (/^\!fuck\ add/i.test(message.content)) {
        const text = message.content.substring(10);
        if (text === "") {
            message.channel.send(usage);
            return;
        }
        if (added_recently.filter(id => message.author.id === id).length > 5) {
            message.channel.send("Cool down, bro. I can't let you add so much at once! Come back in an hour or so.");
            return;
        }
        if (text.length <= 10 || text.length > 256) {
            message.channel.send("Text must be longer than 10 and shorter than 256 characters.\n\n" + usage);
            return;
        }
        if (!/\$\{name\}/g.test(text)) {
            message.channel.send("You must add \`\${name}\` in the place the username should be set.\n\n" + usage);
            return;
        }
        if (await db.get(`SELECT * FROM fucks WHERE lowercase = "${text.toLowerCase()}"`)) {
            message.channel.send("This phrase already exists!");
            return;
        }
        await db.run("INSERT INTO fucks (text, lowercase, author) VALUES (?, ?, ?)", [text, text.toLowerCase(), message.member.displayName]);
        added_recently.push(message.author.id);
        setTimeout(() => {
            // Removes the user from the set after 2.5 seconds
            added_recently.splice(added_recently.indexOf(message.author.id));
        }, 1000 * 60 * 60); // 60 minutes

        await message.channel.send("Added!");
        log(`Added fuck phrase: ${text}`);
        return;
    }
    if (/^\!fuck/i.test(message.content)) {
        if (message.mentions.members.first()) {
            const mention = message.mentions.members.first();
            const phrases = await db.all("SELECT text, author FROM fucks");
            const phrase = phrases.random();
            const author = phrase.author;
            let text = phrase.text;
            text = text.replace(/\$\{name\}'s/g,
                mention.displayName.toLowerCase().charAt(mention.displayName.length - 1) === "s" ?
                    `${mention.displayName}'` :
                    `${mention.displayName}'s`);
            text = text.replace(/\$\{name\}/g, mention.displayName);
            message.channel.send(`*${text}* (submitted by ${author})`);
            log("Served fuck phrase: " + text);
            return;
        }
        message.channel.send(usage);
        return;
    }
}, async function init() {
    await db.run("CREATE TABLE IF NOT EXISTS fucks (text TEXT, lowercase TEXT, author TEXT)");
});

module.exports = command;
