const { timeout, userToString } = require("../modules/util");
const { splitArgs } = require("../modules/util/string");
const secureRandom = require("../modules/secureRandom");
const CONST = require("../modules/CONST");
const Discord = require("discord.js");

const BaseCommand = require("../class/BaseCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

async function getData(message, database, databaseSlots) {
    const mentioned_member = message.mentions.members.first();

    const all_waifus = await database.find({ guildId: message.guild.id }).toArray();
    for (const row of all_waifus) {
        if (!message.guild.members.has(row.ownerId)) {
            await database.deleteMany({ guildId: message.guild.id, ownerId: row.ownerId });
        }

        if (!message.guild.members.has(row.waifuId)) {
            await database.deleteOne({ guildId: message.guild.id, waifuId: row.waifuId });
        }
    }

    const owner_waifus = await database.find({
        ownerId: message.author.id,
        guildId: message.guild.id
    }).toArray();

    const owner_of_me = await database.findOne({
        waifuId: message.author.id,
        guildId: message.guild.id
    });

    const slots = await databaseSlots.findOne({
        waifuId: message.author.id
    });

    return {
        mentioned_member,
        owner_waifus,
        owner_of_me,
        all_waifus,
        slots: slots ? slots.slots : defaultSlots
    };
}

const defaultSlots = 3;

// Database
// { ownerId,
//   waifuId,
//   guildId }

module.exports = async function install(cr, client, config, db) {
    const cooldown_guild = new Array;
    const cooldown_user = new Array;

    const database = db.collection("waifu");
    const databaseSlots = db.collection("waifu_slots");

    const waifuCommand = cr.register("waifu", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("This tool helps you manage your waifus with ease!")
            .setUsage("", "Show all waifus you have claimed"))
        .setCategory(Category.ACTION);

    /**
     * SUB COMMANDS
     */

    waifuCommand.registerSubCommand("claim", new class extends BaseCommand {
        async call(message) {
            const {
                mentioned_member,
                owner_waifus,
                slots
            } = await getData(message, database, databaseSlots);

            if (!mentioned_member) {
                await message.channel.send("must give @ mention your dream waifu!");
                return;
            }

            if (message.author.id === mentioned_member.user.id) {
                await message.channel.send("hahahahahahahahahahahaha that's cute, but no");
                return;
            }

            if (slots - owner_waifus.length === 0) {
                await message.channel.send("Stop it. Get some help. You have filled all your waifu slots already!");
                return;
            }

            if (owner_waifus.some(row => row.waifuId === mentioned_member.user.id)) {
                await message.channel.send("Bruh. You already have this lad owo");
                return;
            }

            const owner = await database.findOne({
                guildId: message.guild.id,
                waifuId: mentioned_member.user.id
            });
            if (owner) {
                const owner_member = message.guild.members.get(owner.ownerId);
                if (owner_member) {
                    await message.channel.send(`Oh nu. ${owner_member.toString()} already claimed this beautiful user!`);
                    return;
                }

                await database.deleteMany({ guildId: message.guild.id, ownerId: owner.ownerId });
            }

            await database.insertOne({
                guildId: message.guild.id,
                ownerId: message.author.id,
                waifuId: mentioned_member.user.id
            });
            await message.channel.send({
                embed: new Discord.RichEmbed()
                    .setColor(CONST.COLOR.PRIMARY)
                    .setAuthor(`Successful claim!!! Deep snug with ${userToString(mentioned_member, true)} incoming!`, mentioned_member.user.avatarURL)
            });
        }
    }).setHelp(new HelpContent().setUsage("<@mention>", "Claim the person you mentioned if not already claimed."));

    waifuCommand.registerSubCommand("unclaim", new class extends BaseCommand {
        async call(message) {
            const {
                mentioned_member,
                owner_waifus
            } = await getData(message, database, databaseSlots);

            if (!mentioned_member) {
                await message.channel.send("must give @ mention!");
                return;
            }

            if (!owner_waifus.find(row => row.waifuId === mentioned_member.user.id)) {
                await message.channel.send("Never had this hun to begin with :v");
                return;
            }

            await database.deleteOne({
                guildId: message.guild.id,
                ownerId: message.author.id,
                waifuId: mentioned_member.user.id
            });
            await message.channel.send("Good bye bb :C");
        }
    }).setHelp(new HelpContent().setUsage("<@mention>", "Unclaim the person you mentioned if already claimed."));

    waifuCommand.registerSubCommand("steal", new class extends BaseCommand {
        async call(message) {
            const {
                mentioned_member,
                owner_waifus,
                all_waifus,
                slots
            } = await getData(message, database, databaseSlots);

            if (slots - owner_waifus.length === 0) {
                await message.channel.send("Stop it. Get some help. You have filled all your waifu slots already!");
                return;
            }

            if (cooldown_guild.includes(message.guild.id)) {
                await message.channel.sendTranslated("Whoa whoa not so fast! There's also a little global cooldown.");
                return;
            }
            cooldown_guild.push(message.guild.id);
            setTimeout(() => {
                cooldown_guild.splice(cooldown_guild.indexOf(message.guild.id), 1);
            }, 15 * 1000);

            if (cooldown_user.includes(message.guild.id)) {
                await message.channel.sendTranslated("Whoa whoa not so fast! Doing this too often in a row will obvi defeat the purpose of the claim command");
                return;
            }
            cooldown_user.push(message.guild.id);
            setTimeout(() => {
                cooldown_user.splice(cooldown_user.indexOf(message.guild.id), 1);
            }, 120 * 1000);

            let waifu;
            if (!mentioned_member) {
                let pending = 100;
                while (!waifu && pending--) {
                    const random = await secureRandom(all_waifus);
                    if (random.waifuId !== message.author.id &&
                        random.ownerId !== message.author.id &&
                        message.guild.members.has(random.waifuId))
                        waifu = random;
                }
            } else {
                if (message.author.id === mentioned_member.user.id) {
                    await message.channel.send("hahahahahahahahahahahaha that's cute, but no");
                    return;
                }

                const w = await database.findOne({ waifuId: mentioned_member.user.id, guildId: message.guild.id });

                if (w) {
                    const owner_member = message.guild.members.get(w.ownerId);
                    if (owner_member) {
                        waifu = w;
                    } else {
                        await database.deleteMany({ guildId: message.guild.id, ownerId: w.ownerId });
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

            const m1 = await message.channel.send(`${userToString(ownerUser)}'s waifu ${userToString(waifuUser)} just seemed to have appeared nearby. You are quietly approaching them...`);
            await timeout(1000);
            const m2 = await message.channel.send(".");
            await timeout(500);
            await m2.edit("..");
            await timeout(500);
            await m2.edit("...");

            const random = await secureRandom(101);

            await timeout(1500);

            if (random > 95) {
                await database.updateOne({
                    guildId: message.guild.id,
                    waifuId: waifuUser.user.id
                }, {
                    $set: {
                        ownerId: message.author.id
                    }
                });
                await m1.delete();
                await m2.edit("... ***ATTACC***", {
                    embed: new Discord.RichEmbed()
                        .setColor(CONST.COLOR.PRIMARY)
                        .setAuthor(`Successful steal!!! ${userToString(waifuUser, true)} now belongs to you!`, waifuUser.user.avatarURL)
                });
                return;
            } else {
                await m1.delete();
                await m2.edit(`${userToString(waifuUser)} had got wind of your plans and dashed off at the next chance :c`);
                return;
            }
        }
    }).setHelp(new HelpContent()
        .setUsage("<@mention>", "Steals a random waifu with a chance of 5%.")
        .addParameter("@mention", "The waifu you want to perform actions on"));

    waifuCommand.registerSubCommand("trade", new class extends BaseCommand {
        async call(message, content) {
            const {
                owner_waifus
            } = await getData(message, database, databaseSlots);

            if (message.mentions.members.size !== 2) {
                await message.channel.send("Specify waifu you want to trade, and the waifu you want to have.");
                return;
            }

            const matched = content.match(/<@!?(1|\d{17,19})>/g);

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
                await message.channel.send(`${userToString(my_waifu)} can't be traded, because they don't belong to you!`);
                return;
            }

            const trade_waifu = await database.findOne({
                waifuId: other_waifu.user.id,
                guildId: message.guild.id
            });
            if (trade_waifu.ownerId === message.author.id) {
                await message.channel.send(`${userToString(other_waifu)} belongs to you. But second @mention should be someone else's waifu.`);
                return;
            }

            const other_owner = message.guild.members.get(trade_waifu.ownerId);
            if (!trade_waifu || !other_owner) {
                await message.channel.send(`${userToString(my_waifu)} can't be traded, because they don't belong to anyone!`);
                return;
            }

            await message.channel.send(`${userToString(other_owner)}, do you agree to trade your ${userToString(other_waifu)} with ${userToString(my_waifu)}? \`yes\`, \`no\`?`);

            const messages = await message.channel.awaitMessages((message) => {
                if (message.author.id !== other_owner.user.id) return false;
                if (!/^(yes|no)\b/i.test(message.content)) return false;
                return true;
            }, {
                maxMatches: 1,
                time: 4 * 60 * 1000
            });

            if (messages.size === 0) {
                await message.channel.send("Timeout :v guess they don't wanna");
                return;
            }

            const resultContent = messages.first().content;

            if (/^(no+|no+pe)\b/i.test(resultContent)) {
                await message.channel.send(`N'aww :c poor ${userToString(message.member)}`);
                return;
            }

            await database.updateOne({ waifuId: my_waifu.user.id, guildId: message.guild.id }, { $set: { ownerId: other_owner.user.id } });
            await database.updateOne({ waifuId: other_waifu.user.id, guildId: message.guild.id }, { $set: { ownerId: message.author.id } });

            await message.channel.send({
                embed: new Discord.RichEmbed()
                    .setColor(CONST.COLOR.PRIMARY)
                    .setTitle("Trading")
                    .setDescription(`${userToString(my_waifu)}** :arrow_right: ${userToString(other_owner)}**` + 
                    `**${userToString(message.member)}** :arrow_left: **${userToString(other_waifu)}**`)
            });
        }
    }).setHelp(new HelpContent()
        .setUsage("<@your waifu> <@other waifu>", "Trade `your waifu` with `other waifu`")
        .addParameter("@your waifu", "Must be one of your waifus. This one will be traded")
        .addParameter("@other waifu", "Must be someone's waifu. This is the one you want to get"));

    // waifuCommand.registerSubCommand("buyslot", new class extends BaseCommand {
    //     async call(message, msg) {
    //         const {
    //             mentioned_member,
    //             owner_waifus,
    //             owner_of_me
    //         } = await getData(message, database);
    //     }
    // });

    waifuCommand.registerSubCommand("addslots", new class extends BaseCommand {
        async call(message, content) {
            const member = message.mentions.members.first();
            if (!member) return;

            const v = splitArgs(content, 2);

            const slots = parseInt(v[1]);
            if (Number.isNaN(slots)) return;

            await databaseSlots.updateOne({ waifuId: member.user.id }, { $set: { slots } }, { upsert: true });

            await message.channel.send("yo :ok_hand:");
        }
    })
        .setCategory(Category.OWNER);

    waifuCommand.registerDefaultCommand(new class extends BaseCommand {
        async call(message) {
            const {
                owner_waifus,
                owner_of_me,
                slots
            } = await getData(message, database, databaseSlots);

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
                    str += userToString(member) + "\n";
                }
                embed.setDescription(str);
            }

            if (owner_of_me) {
                const owner = message.guild.members.get(owner_of_me.ownerId);
                if (owner)
                    embed.addField("Owned by", userToString(owner));
            }

            embed.setFooter(`Total Waifus: ${owner_waifus.length} - Available Slots: ${slots - owner_waifus.length}`);
            await message.channel.send({ embed });
        }
    });  
};