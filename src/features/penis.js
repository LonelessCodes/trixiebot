const CONST = require("../modules/CONST");
const secureRandom = require("../modules/secureRandom");
const Discord = require("discord.js");

const BaseCommand = require("../class/BaseCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("penis");

    const penisCommand = cr.register("penis", new TreeCommand)
        .setExplicit(true)
        .setHelp(new HelpContent()
            .setDescription("Check on what package your buddy is carrying~ (or you are caring)\nRandomy generated penis size.")
            .setUsage("<?mention>")
            .addParameterOptional("mention", "User who's penis you wish to ~~pleasure~~ measure"))
        .setCategory(Category.ACTION);

    /**
     * SUB COMMANDS
     */

    penisCommand.registerDefaultCommand(new class extends BaseCommand {
        async call(message) {
            const uom = message.guild.config.uom;
            const r = uom === "cm" ? 2.54 : 1;

            const member = message.alt_mentions.members.first() || message.member;

            if (message.alt_mentions.everyone) {
                await message.channel.sendTranslated("everyone has fucking huge diccs k. You're all beautiful");
                return;
            }

            if (member.user.id === client.user.id) {
                const length = 20;
                const girth = 18;
                await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D ( ͡° ͜ʖ ͡°)\n${await message.channel.translate("Length:")} **${(length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(girth * r).toFixed(1)} ${uom}**`);
                return;
            }

            const doc = await database.findOne({ userId: member.user.id });
            if (!doc) {
                const random = (await secureRandom()) - 0.2;
                const length = Math.pow((random > 0 ?
                    (Math.pow(random, 1.4) + 0.2) * 15 + 3 :
                    (random + 0.2) * 15 + 3) / 20, 1.4) * 20 + 1.5;
                const girth = Math.pow(((await secureRandom()) + (random - 0.1) * 2) * 0.3, 2) * 8 + 6;

                await database.insertOne({
                    userId: member.user.id,
                    girth,
                    length
                });

                await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D\n${await message.channel.translate("Length:")} **${(length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(girth * r).toFixed(1)} ${uom}**`);
                return;
            } else {
                const { length, girth } = doc;

                await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D\n${await message.channel.translate("Length:")} **${(length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(girth * r).toFixed(1)} ${uom}**`);
                return;
            }
        }
    });

    penisCommand.registerSubCommand("leaderboard", new class extends BaseCommand {
        async call(message) {
            const uom = message.guild.config.uom;
            const r = uom === "cm" ? 2.54 : 1;

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

            const penises = await database.find({ $or: message.guild.members.array().map(member => ({ userId: member.user.id })) }).toArray();
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
        }
    })
        .setHelp(new HelpContent()
            .setUsage("", "Shows where you are in the penis size ranking"));

    cr.registerAlias("penis", "cock");
    cr.registerAlias("penis", "dick");
};