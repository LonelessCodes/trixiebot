const { timeout } = require("../modules/util");
const randomNumber = require("random-number-csprng");
const CONST = require("../modules/const");
const Command = require("../class/Command");
const Discord = require("discord.js");

const cooldown_guild = new Array;
const cooldown_user = new Array;

class WaifuCommand extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("waifu");
    }

    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^waifu\b/i.test(message.content)) return;

        const msg = message.content.substr(6).trim();
        const mentioned_member = message.mentions.members.first();

        // { ownerId,
        //   waifuId,
        //   guildId }

        const all_waifus = await this.db.find({ guildId: message.guild.id }).toArray();
        for (const row of all_waifus) {
            if (!message.guild.members.has(row.ownerId)) {
                await this.db.deleteMany({ guildId: message.guild.id, ownerId: row.ownerId });
            }

            if (!message.guild.members.has(row.waifuId)) {
                await this.db.deleteOne({ guildId: message.guild.id, waifuId: row.waifuId });
            }
        }

        const owner_waifus = await this.db.find({
            ownerId: message.author.id,
            guildId: message.guild.id
        }).toArray();

        const owner_of_me = await this.db.findOne({
            waifuId: message.author.id,
            guildId: message.guild.id
        });

        if (/^claim\b/i.test(msg)) {
            if (!mentioned_member) {
                await message.channel.send("must give @ mention your dream waifu!");
                return;
            }

            if (message.author.id === mentioned_member.user.id) {
                await message.channel.send("hahahahahahahahahahahaha that's cute, but no");
                return;
            }

            if (3 - owner_waifus.length === 0) {
                await message.channel.send("Stop it. Get some help. You have filled all your waifu slots already!");
                return;
            }

            if (owner_waifus.some(row => row.waifuId === mentioned_member.user.id)) {
                await message.channel.send("Bruh. You already have this lad owo");
                return;
            }

            const owner = await this.db.findOne({
                guildId: message.guild.id,
                waifuId: mentioned_member.user.id
            });
            if (owner) {
                const owner_member = message.guild.members.get(owner.ownerId);
                if (owner_member) {
                    await message.channel.send(`Oh nu. ${owner_member.toString()} already claimed this beautiful user!`);
                    return;
                }
                
                await this.db.deleteMany({ guildId: message.guild.id, ownerId: owner.ownerId });
            }

            await this.db.insertOne({
                guildId: message.guild.id,
                ownerId: message.author.id,
                waifuId: mentioned_member.user.id
            });
            await message.channel.send({
                embed: new Discord.RichEmbed()
                    .setColor(CONST.COLOR.PRIMARY)
                    .setAuthor(`Successful claim!!! Deep snug with ${mentioned_member.displayName} incoming!`, mentioned_member.user.avatarURL)
            });
            return;
        }

        if (/^unclaim\b/i.test(msg)) {
            if (!mentioned_member) {
                await message.channel.send("must give @ mention!");
                return;
            }

            if (!owner_waifus.find(row => row.waifuId === mentioned_member.user.id)) {
                await message.channel.send("Never had this hun to begin with :v");
                return;
            }

            await this.db.deleteOne({
                guildId: message.guild.id,
                ownerId: message.author.id,
                waifuId: mentioned_member.user.id
            });
            await message.channel.send("Good bye bb :C");
            return;
        }

        if (/^steal\b/i.test(msg)) {
            if (3 - owner_waifus.length === 0) {
                await message.channel.send("Stop it. Get some help. You have filled all your waifu slots already!");
                return;
            }

            if (cooldown_guild.includes(message.guild.id)) {
                await message.channel.send("Not so hastily!");
                return;
            }
            cooldown_guild.push(message.guild.id);
            setTimeout(() => {
                cooldown_guild.splice(cooldown_guild.indexOf(message.guild.id), 1);
            }, 10 * 1000);

            if (cooldown_user.includes(message.guild.id)) {
                await message.channel.send("Not so hastily!");
                return;
            }
            cooldown_user.push(message.guild.id);
            setTimeout(() => {
                cooldown_user.splice(cooldown_user.indexOf(message.guild.id), 1);
            }, 60 * 1000);

            let waifu;
            if (!mentioned_member) {
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
                if (message.author.id === mentioned_member.user.id) {
                    await message.channel.send("hahahahahahahahahahahaha that's cute, but no");
                    return;
                }

                const w = await this.db.findOne({ waifuId: mentioned_member.user.id, guildId: message.guild.id });

                if (w) {
                    const owner_member = message.guild.members.get(w.ownerId);
                    if (owner_member) {
                        waifu = w;
                    } else {
                        await this.db.deleteMany({ guildId: message.guild.id, ownerId: w.ownerId });
                        await message.channel.send(`This waifu has not been claimed yet. User \`${message.prefix}waifu claim @ ${mentioned_member.displyaName}\` to call them your own!`);
                        return;
                    }
                } else {
                    await message.channel.send(`This waifu has not been claimed yet. User \`${message.prefix}waifu claim @ ${mentioned_member.displyaName}\` to call them your own!`);
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
                        .setColor(CONST.COLOR.PRIMARY)
                        .setAuthor(`Successful steal!!! ${waifuUser.displayName} now belongs to you!`, waifuUser.user.avatarURL)
                });
                return;
            } else {
                await message.channel.send(`**${waifuUser.displayName}** had got wind of your plans and dashed off at the next chance :c`);
                return;
            }
        }

        if (/^trade\b/i.test(msg)) {
            if (message.mentions.members.size !== 2) {
                await message.channel.send("Specify waifu you want to trade, and the waifu you want to have.");
                return;
            }

            const matched = message.content.match(/<@!?(1|\d{17,19})>/g);

            let has_ex = matched[0].indexOf("!") > -1;
            const my_waifu = message.guild.members.get(
                matched[0].substr(has_ex ? 3 : 2, matched[0].length - (has_ex ? 4 : 3)));
            
            has_ex = matched[1].indexOf("!") > -1;
            const other_waifu = message.guild.members.get(
                matched[1].substr(has_ex ? 3 : 2, matched[1].length - (has_ex ? 4 : 3)));

            if (message.author.id === my_waifu.user.id ||
                message.author.id === other_waifu.user.id) {
                await message.channel.send("hahahahahahahahahahahaha that's cute, but no");
                return;
            }

            const waifu = owner_waifus.find(w => w.waifuId === my_waifu.user.id);
            if (!waifu) {
                await message.channel.send(`**${my_waifu.displayName}** can't be traded, because they don't belong to you!`);
                return;
            }

            const trade_waifu = await this.db.findOne({
                waifuId: other_waifu.user.id,
                guildId: message.guild.id
            });
            if (trade_waifu.ownerId === message.author.id) {
                await message.channel.send(`**${other_waifu.displayName}** belongs to you. But second @mention should be someone else's waifu.`);
                return;
            }

            const other_owner = message.guild.members.get(trade_waifu.ownerId);
            if (!trade_waifu || !other_owner) {
                await message.channel.send(`**${my_waifu.displayName}** can't be traded, because they don't belong to anyone!`);
                return;
            }

            await message.channel.send(`**${other_owner.displayName}**, do you agree to trade your **${other_waifu.displayName}** with **${my_waifu.displayName}**? \`yes\`, \`no\`?`);

            const messages = await message.channel.awaitMessages((message) => {
                if (message.author.id !== other_owner.user.id) return false;
                if (!/^(yes|no)\b/i.test(message.content)) return false;
                return true;
            }, {
                maxMatches: 1,
                time: 2 * 60 * 1000
            });
            
            if (messages.size === 0) {
                await message.channel.send("Timeout :v guess they don't wanna");
                return;
            }

            const msg = messages.first().content;

            if (/^no\b/i.test(msg)) {
                await message.channel.send(`N'aww :c poor **${message.member.displayName}**`);
                return;
            }

            await this.db.updateOne({ waifuId: my_waifu.user.id, guildId: message.guild.id }, { $set: { ownerId: other_owner.user.id } });
            await this.db.updateOne({ waifuId: other_waifu.user.id, guildId: message.guild.id }, { $set: { ownerId: message.author.id } });

            await message.channel.send({
                embed: new Discord.RichEmbed()
                    .setColor(CONST.COLOR.PRIMARY)
                    .setTitle("Trading")
                    .setDescription(`**${my_waifu.displayName}** :arrow_right: **${other_owner.displayName}**
**${message.member.displayName}** :arrow_left: **${other_waifu.displayName}**`)
            });
            return;
        }

        if (/^buyslot\b/i.test(msg)) {
            return;
        }

        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
        embed.setThumbnail(message.author.avatarURL);
        embed.setTitle("Your Waifus");

        if (!owner_waifus.length) {
            embed.setDescription(`No waifus to see here, just dust :(\nYou can get waifus by claiming someone! Use \`${message.prefix}waifu claim\` to get started.`);
        } else {
            let str = "";
            for (const waifu of owner_waifus) {
                const member = message.guild.members.get(waifu.waifuId);
                if (!member) continue;
                str += `**${member.user.username}** #${member.user.discriminator}\n`;
            }
            embed.setDescription(str);
        }

        if (owner_of_me) {
            const owner = message.guild.members.get(owner_of_me.ownerId);
            if (owner)
                embed.addField("Owned by", `**${owner.user.username}** #${owner.user.discriminator}\n`);
        }

        embed.setFooter(`Total Waifus: ${owner_waifus.length} - Available Slots: ${3 - owner_waifus.length}`);
        await message.channel.send({ embed });
    }

    get guildOnly() { return true; }

    usage(prefix) {
        return `\`${prefix}waifu\` - Show all waifus you have claimed.
\`${prefix}waifu claim <@mention>\` - Claim the person you mentioned if not already claimed.
\`${prefix}waifu unclaim <@mention>\` - Unclaim the person you mentioned if already claimed.
\`${prefix}waifu steal <@mention>\` - Steals a random waifu with a chance of 5%.
\`${prefix}waifu trade <@your waifu> with <@other waifu> - Trade waifus with other senpais.`;
    }
}

module.exports = WaifuCommand;
