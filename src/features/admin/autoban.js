const CONST = require("../../modules/const");
const globToRegExp = require("glob-to-regexp");
const Discord = require("discord.js");
const Command = require("../../class/Command");

class AutoBan extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("autoban");

        this.client.on("guildMemberAdd", async member => {
            if (!member.bannable) return;

            const guild = member.guild;

            const conditions = await this.db.find({ guildId: guild.id }).toArray();
            const regexps = conditions.map(c => globToRegExp(c.pattern, { flags: "gi", extended: true }));

            const username = member.user.username;

            for (const regexp of regexps) {
                if (regexp.test(username)) {
                    await member.ban("Banned because of autoban pattern");
                    return;
                }
            }
        });
    }

    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^autoban\b/i.test(message.content)) return;

        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.BAN_MEMBERS);
        if (!permission) return;

        if (/^autoban add\b/i.test(message.content)) {
            const msg = message.content.substr(12);

            await this.db.insertOne({ guildId: message.guild.id, action: "ban", pattern: msg });

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setDescription(`:police_car: Added \`${msg}\` as a pattern`);

            await message.channel.send({ embed });
            return;
        }

        if (/^autoban remove\b/i.test(message.content)) {
            const msg = message.content.substr(15);

            const deleted = await this.db.deleteOne({ guildId: message.guild.id, pattern: msg });

            const embed = new Discord.RichEmbed();
            if (deleted.result.n === 0) {
                embed.setColor(CONST.COLOR.ERROR);
                embed.setDescription("No such pattern configured");
            } else {
                embed.setColor(CONST.COLOR.PRIMARY);
                embed.setDescription(`Deleted \`${msg}\` as a pattern`);
            }

            await message.channel.send({ embed });
            return;
        }

        const conditions = await this.db.find({ guildId: message.guild.id }).toArray();

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        embed.setTitle("Current AutoBan Patterns");
        embed.setDescription((conditions.length ?
            conditions.map(c => "`" + c.pattern + "`").join("\n") :
            "No autoban patterns yet. Add some by using `!autoban add <pattern>`") + 
            "\n\n Patterns use the glob pattern documentation. It is an easy to understand text pattern matching solution. Check https://en.wikipedia.org/wiki/Glob_(programming)#Syntax for the info.");

        await message.channel.send({ embed });
        return;
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return `\`${prefix}autoban\` view the autoban expressions of this server
\`${prefix}autoban add <expression>\` add an expression banning joining users if they match it
\`${prefix}autoban remove <expression>\` remove an expression again`;
    }
}

module.exports = AutoBan;
