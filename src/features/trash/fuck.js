const log = require("../../modules/log");
const Command = require("../../class/Command");

Array.prototype.random = function randomItem() {
    return this[Math.floor(Math.random() * this.length)];
};

const added_recently = new Array();

class FuckCommand extends Command {
    constructor(client, config, db) {
        super(client, config);
        this.db = db.collection("fuck");
    }
    async onmessage(message) {
        if (!message.prefixUsed) return;

        if (/^fuck add\b/i.test(message.content)) {
            const text = message.content.substr(9);
            if (text === "") {
                await message.channel.send(this.usage(message.prefix));
                log("Sent fuck add usage");
                return;
            }
            if (added_recently.filter(id => message.author.id === id).length > 5) {
                await message.channel.send("Cool down, bro. I can't let you add so much at once! Come back in an hour or so.");
                log(`Gracefully aborted adding fuck text. User ${message.author.username} reached cooldown`);
                return;
            }
            if (text.length <= 10 || text.length > 256) {
                await message.channel.send("Text must be longer than 10 and shorter than 256 characters.\n\n" + this.usage(message.prefix));
                log("Gracefully aborted adding fuck text. Text too long");
                return;
            }
            if (!/\$\{name\}/g.test(text)) {
                await message.channel.send("You must add `${name}` in the place the username should be set.\n\n" + this.usage(message.prefix));
                log("Gracefully aborted adding fuck text. Missing ${name} in text");
                return;
            }
            if (await this.db.findOne({ lowercase: text.toLowerCase() })) {
                await message.channel.send("This phrase already exists!");
                log("Gracefully aborted adding fuck text. Text already exists");
                return;
            }
            await this.db.insertOne({
                text,
                lowercase: text.toLowerCase(),
                author: message.author.tag,
                authorId: message.author.id
            });
            added_recently.push(message.author.id);
            setTimeout(() => {
                added_recently.splice(added_recently.indexOf(message.author.id));
            }, 1000 * 60 * 60); // 60 minutes

            await message.channel.send("Added!");
            log(`Added fuck phrase: ${text}`);
            return;
        }

        if (/^fuck\b/i.test(message.content)) {
            const mention = message.channel.type === "text" ?
                message.mentions.members.first() :
                message.mentions.users.first();
            if (mention) {
                const phrases = await this.db.find({}).toArray(); // return only text and author
                if (phrases.length === 0) {
                    message.channel.send(`I'm sorry, but... I don't have any fucks to give. Add fucks using \`${message.prefix}fuck add\``);
                    log("Couldn't serve fuck phrase. No fuck phrases in DB");
                    return;
                }

                const phrase = phrases.random();
                const author = phrase.author;
                const username = mention.displayName || mention.username;
                let text = phrase.text;
                text = text.replace(/\$\{name\}'s/g,
                    username.toLowerCase().charAt(username.length - 1) === "s" ?
                        `${username}'` :
                        `${username}'s`);
                text = text.replace(/\$\{name\}/g, username);
                message.channel.send(`*${text}* (submitted by ${author})`);
                log("Served fuck phrase: " + text);
                return;
            }

            await message.channel.send(this.usage(message.prefix));
            log("Sent fuck usage");
            return;
        }
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return `\`${prefix}fuck <user>\`
\`user\` - the username of the user to fuck

\`${prefix}fuck add <text>\`
\`text\` - the text the bot is supposed to say. It must contain \`\${name}\` in the place the username should be set. E.g.: \`${prefix}fuck add rides \${name}'s skin bus into tuna town\``;
    }
}

module.exports = FuckCommand;
