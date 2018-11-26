const log = require("../../modules/log");

const BaseCommand = require("../../class/BaseCommand");
const TreeCommand = require("../../class/TreeCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");
// const RateLimiter = require("../../logic/RateLimiter");
// const TimeUnit = require("../../modules/TimeUnit");

Array.prototype.random = function randomItem() {
    return this[Math.floor(Math.random() * this.length)];
};

module.exports = async function install(cr, client, config, db) {
    const added_recently = new Array();

    const database = db.collection("fuck");

    const fuckCommand = cr.register("fuck", new class extends TreeCommand {
        get help() {
            return new HelpContent().setUsage(`\`{{prefix}}fuck <user>\`
\`user\` - the username of the user to fuck

\`{{prefix}}fuck add <text>\`
\`text\` - the text the bot is supposed to say. It must contain \`\${name}\` in the place the username should be set. E.g.: \`{{prefix}}fuck add rides \${name}'s skin bus into tuna town\``);
        }
    })
        .setCategory(Category.ACTION);

    /**
     * SUB COMMANDS
     */

    fuckCommand.registerSubCommand("add", new class extends BaseCommand {
        async call(message, text) {
            if (text === "") {
                return;
            }
            if (added_recently.filter(id => message.author.id === id).length > 5) {
                await message.channel.send("Cool down, bro. I can't let you add so much at once! Come back in an hour or so.");
                log(`Gracefully aborted adding fuck text. User ${message.author.username} reached cooldown`);
                return;
            }
            if (text.length <= 10 || text.length > 256) {
                await message.channel.send("Text must be longer than 10 and shorter than 256 characters.");
                log("Gracefully aborted adding fuck text. Text too long");
                return;
            }
            if (!/\$\{name\}/g.test(text)) {
                await message.channel.send("You must add `${name}` in the place the username should be set.");
                log("Gracefully aborted adding fuck text. Missing ${name} in text");
                return;
            }
            if (await database.findOne({ lowercase: text.toLowerCase() })) {
                await message.channel.send("This phrase already exists!");
                log("Gracefully aborted adding fuck text. Text already exists");
                return;
            }
            await database.insertOne({
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
        }
    });
    // .setRateLimiter(new RateLimiter(TimeUnit.HOUR, 1));

    fuckCommand.registerDefaultCommand(new class extends BaseCommand {
        async call(message) {
            const mention = message.mentions.members.first();
            if (!mention) {
                return;
            }
            
            const phrases = await database.find({}).toArray(); // return only text and author
            if (phrases.length === 0) {
                message.channel.send(`I'm sorry, but... I don't have any fucks to give. Add fucks using \`${message.prefix}fuck add\``);
                log("Couldn't serve fuck phrase. No fuck phrases in DB");
                return;
            }

            const phrase = phrases.random();
            const username = mention.displayName;
            let text = phrase.text;
            text = text.replace(/\$\{name\}'s/g,
                username.toLowerCase().charAt(username.length - 1) === "s" ?
                    `${username}'` :
                    `${username}'s`);
            text = text.replace(/\$\{name\}/g, username);
            message.channel.send(text);
            return;
        }
    });
};