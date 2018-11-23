const log = require("../modules/log");
const CONST = require("../modules/CONST");
const BaseCommand = require("../class/BaseCommand");
const Discord = require("discord.js");

class PenisCommand extends BaseCommand {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("penis");
    }

    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^(penis|cock|dick)\b/i.test(message.content)) return;
        
        const uom = message.guild.config.uom;
        const r = uom === "cm" ? 2.54 : 1;

        const msg = message.content.substr(message.content.split(/\b/g)[0].length + 1).trim();
        if (/^leaderboard\b/i.test(msg)) {
            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

            const penises = await this.db.find({ $or: message.guild.members.array().map(member => ({ userId: member.user.id })) }).toArray();
            const sorted = penises.sort((a, b) => b.length - a.length);

            embed.setTitle(`${message.guild.name} Penis Leaderboard`);
            for (const penis of sorted) {
                const member = message.guild.members.find(member => member.user.id === penis.userId);
                if (!member) continue;
                embed.addField(
                    `8${new Array(Math.round(penis.length)).fill("=").join("")}D   ${member.user.tag}`,
                    `${await message.channel.translate("Length:")} **${(penis.length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(penis.girth * r).toFixed(1)} ${uom}**`
                );
            }

            await message.channel.send({ embed });
            log(`Served penis leaderboard for guild ${message.guild.id}`);
            return;
        }

        const member = message.mentions.members.first() || message.member;

        if (message.mentions.everyone) {
            await message.channel.sendTranslated("everyone has fucking huge diccs k. You're all beautiful");
            log("Requested everyobne's dicks");
            return;
        }

        if (member.user.id === this.client.user.id) {
            const length = 20;
            const girth = 18;
            await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D ( ͡° ͜ʖ ͡°)\n${await message.channel.translate("Length:")} **${(length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(girth * r).toFixed(1)} ${uom}**`);
            log("Requested Trixie's dick");
            return;
        }

        const doc = await this.db.findOne({ userId: member.user.id });
        if (!doc) {
            const random = Math.random() - 0.2;
            const length = Math.pow((random > 0 ?
                (Math.pow(random, 1.4) + 0.2) * 15 + 3 :
                (random + 0.2) * 15 + 3) / 20, 1.4) * 20 + 1.5;
            const girth = Math.pow((Math.random() + (random - 0.1) * 2) * 0.3, 2) * 8 + 6;

            await this.db.insertOne({
                userId: member.user.id,
                girth,
                length
            });

            await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D\n${await message.channel.translate("Length:")} **${(length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(girth * r).toFixed(1)} ${uom}**`);
            log(`Requested unknown dick => created new dick for user ${message.member.id} with ${girth} in girth, ${length} in length`);
            return;
        } else {
            const { length, girth } = doc;

            await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D\n${await message.channel.translate("Length:")} **${(length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(girth * r).toFixed(1)} ${uom}**`);
            log(`Requested known dick of user ${message.member.id} with ${girth} in girth, ${length} in length`);
            return;
        }
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return `\`${prefix}penis <mention?>\` - check on what package your buddy is carrying~ (alias ${prefix}cock, ${prefix}dick)
\`mention\` - optional`;
    }
}

module.exports = PenisCommand;
