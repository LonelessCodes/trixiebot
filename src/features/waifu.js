const { timeout } = require("../modules/util");
const log = require("../modules/log");
const randomNumber = require("random-number-csprng");
const CONST = require("../modules/const");
const Command = require("../class/Command");
const Discord = require("discord.js");

const cooldown = new Array;

class WaifuCommand extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("waifu");
    }

    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^waifu\b/i.test(message.content)) return;

        const msg = message.content.substr(6).trim();
        const member = message.mentions.members.first();

        // { ownerId,
        //   waifuId,
        //   guildId }

        const ownerWaifus = await this.db.find({ ownerId: message.author.id, guildId: message.guild.id }).toArray();

        if (/^claim\b/i.test(msg)) {
            // if (member.user.bot) {
            //     await message.channel.send("As perfect as some bots are, I'm afraid this is not possible :c");
            //     return;
            // }

            if (!member) {
                await message.channel.send("must give @ mention your dream waifu!");
                return;
            }

            if (message.author.id === member.user.id) {
                await message.channel.send("hahahahahahahahahahahaha that's cute, but no");
                return;
            }

            if (3 - ownerWaifus.length === 0) {
                await message.channel.send("Stop it. Get some help. You have filled all your waifu slots already!");
                return;
            }

            if (ownerWaifus.find(row => row.waifuId === member.user.id)) {
                await message.channel.send("Bruh. You already have this lad owo");
                return;
            }

            const otherOwner = await this.db.findOne({ guildId: message.guild.id, waifuId: member.user.id });
            if (otherOwner) {
                await message.channel.send(`Oh nu. ${message.guild.members.get(otherOwner.ownerId).toString()} already claimed this beautiful user!`);
                return;
            }

            await this.db.insertOne({
                guildId: message.guild.id,
                ownerId: message.author.id,
                waifuId: member.user.id
            });
            await message.channel.send({
                embed: new Discord.RichEmbed()
                    .setColor(CONST.COLOUR)
                    .setAuthor(`Successful claim!!! Have luck with ${member.displayName}!`, member.user.avatarURL)
            });
            return;
        }

        if (/^unclaim\b/i.test(msg)) {
            if (!member) {
                await message.channel.send("must give @ mention!");
                return;
            }

            if (!ownerWaifus.find(row => row.waifuId === member.user.id)) {
                await message.channel.send("Never had this hun to begin with :v");
                return;
            }

            await this.db.deleteOne({
                guildId: message.guild.id,
                ownerId: message.author.id,
                waifuId: member.user.id
            });
            await message.channel.send("Good bye bb :C");
            return;
        }

        if (/^steal\b/i.test(msg)) {
            if (3 - ownerWaifus.length === 0) {
                await message.channel.send("Stop it. Get some help. You have filled all your waifu slots already!");
                return;
            }

            if (cooldown.includes(message.guild.id)) {
                await message.channel.send("Not so hastily!");
                return;
            }

            cooldown.push(message.guild.id);
            setTimeout(() => {
                cooldown.splice(cooldown.indexOf(message.guild.id), 1);
            }, 60 * 1000);

            if (message.author.id === member.user.id) {
                await message.channel.send("hahahahahahahahahahahaha that's cute, but no");
                return;
            }

            let waifu;
            if (!member) {
                const allWaifus = await this.db.find({ guildId: message.guild.id }).toArray();

                let pending = 100;
                while (!waifu && pending--) {
                    const random = await randomNumber(0, allWaifus.length - 1);
                    if (allWaifus[random].waifuId !== message.author.id &&
                        allWaifus[random].ownerId !== message.author.id &&
                        message.guild.members.has(allWaifus[random].waifuId))
                        waifu = allWaifus[random];
                }
            } else {
                const w = await this.db.findOne({ waifuId: member.user.id, guildId: message.guild.id });

                if (w) {
                    waifu = w;
                } else {
                    await message.channel.send(`This waifu has not been claimed yet. User \`${message.prefix}waifu claim @ ${member.displyaName}\` to call them your own!`);
                    return;
                }
            }

            if (!waifu) {
                await message.channel.send("No waifu around to steal ;n;");
                return;
            }

            const ownerUser = message.guild.members.get(waifu.ownerId);
            const waifuUser = message.guild.members.get(waifu.waifuId);

            await message.channel.send(`**${ownerUser.displayName}**'s waifu **${waifuUser.displayName}** just seemed to have appeared nearby. You are quietly approaching them...`);
            await timeout(1000);
            const m = await message.channel.send(".");
            await timeout(500);
            await m.edit("..");
            await timeout(500);
            await m.edit("...");

            const random = await randomNumber(0, 100);

            await timeout(1500);

            if (random > 95) {
                await m.edit("... ***ATTACC***");

                await this.db.updateOne({
                    guildId: message.guild.id,
                    waifuId: waifuUser.user.id
                }, {
                    $set: {
                        ownerId: message.author.id
                    }
                });
                await message.channel.send({
                    embed: new Discord.RichEmbed()
                        .setColor(CONST.COLOUR)
                        .setAuthor(`Successful steal!!! ${waifuUser.displayName} now belongs to you!`, waifuUser.user.avatarURL)
                });
                return;
            } else {
                await message.channel.send(`**${waifuUser.displayName}** had got wind of your plans and dashed off at the next chance :c`);
                return;
            }
        }

        if (/^buyslot\b/i.test(msg)) {
            return;
        }

        const embed = new Discord.RichEmbed().setColor(CONST.COLOUR);
        embed.setThumbnail(message.author.avatarURL);
        embed.setTitle("Your Waifus");

        if (!ownerWaifus) {
            embed.setDescription(`No waifus to see here, just dust :(\nYou can get waifus by claiming someone! Use ${message.prefix}waifu claim to get started.`);
        } else {
            let str = "";
            for (const waifu of ownerWaifus) {
                const member = message.guild.members.get(waifu.waifuId);
                if (!member) continue;
                str += `**${member.user.username}** #${member.user.discriminator}\n`;
            }
            embed.setDescription(str);
        }

        embed.setFooter(`Total Waifus: ${ownerWaifus.length} - Available Slots: ${3 - ownerWaifus.length}`);
        await message.channel.send({ embed });
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return `\`${prefix}waifu\` - Show all waifus you have claimed.
\`${prefix}waifu claim <@mention>\` - Claim the person you mentioned if not already claimed.
\`${prefix}waifu unclaim <@mention>\` - Unclaim the person you mentioned if already claimed.
\`${prefix}waifu steal\` - Steals a random waifu with a chance of 5%`;
    }
}

module.exports = WaifuCommand;
