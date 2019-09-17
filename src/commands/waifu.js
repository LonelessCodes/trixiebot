/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { userToString } = require("../util/util");
const { timeout } = require("../util/promises");
const { splitArgs } = require("../util/string");
const { toHumanTime } = require("../util/time");
const secureRandom = require("../modules/random/secureRandom");
const credits = require("../core/managers/CreditsManager");
const purchaseSlots = require("../core/managers/credits/purchaseSlots");
const CONST = require("../const");
const Discord = require("discord.js");

const BaseCommand = require("../core/commands/BaseCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const RateLimiter = require("../util/commands/RateLimiter");
const MessageMentions = require("../util/commands/MessageMentions");
const TimeUnit = require("../modules/TimeUnit");

async function getData(message, content, database, databaseSlots) {
    const mentions = content ? new MessageMentions(content, message.guild) : null;
    const mentioned_member = mentions ? mentions.members.first() : null;

    const all_waifus = await database.find({ guildId: message.guild.id }).toArray();
    for (const row of all_waifus) {
        if (!await message.guild.fetchMember(row.ownerId)) {
            await database.deleteMany({ guildId: message.guild.id, ownerId: row.ownerId });
        }

        if (!await message.guild.fetchMember(row.waifuId)) {
            await database.deleteOne({ guildId: message.guild.id, waifuId: row.waifuId });
        }
    }

    const owner_waifus = await database.find({
        ownerId: message.author.id,
        guildId: message.guild.id,
    }).toArray();

    const owner_of_me = await database.findOne({
        waifuId: message.author.id,
        guildId: message.guild.id,
    });

    const slots = await databaseSlots.findOne({
        waifuId: message.author.id,
    });

    return {
        mentions,
        mentioned_member,
        owner_waifus,
        owner_of_me,
        all_waifus,
        slots: slots ? slots.slots : DEFAULT_SLOTS,
    };
}

const DEFAULT_SLOTS = 3;
const MAX_SLOTS = 15;

// Database
// { ownerId,
//   waifuId,
//   guildId }

module.exports = function install(cr, client, config, db) {
    const database = db.collection("waifu");
    const databaseSlots = db.collection("waifu_slots");

    const waifuCommand = cr.registerCommand("waifu", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("This tool helps you manage your waifus with ease!")
            .setUsage("", "Show all waifus you have claimed"))
        .setCategory(Category.ACTION);

    /**
     * SUB COMMANDS
     */

    waifuCommand.registerSubCommand("claim", new class extends BaseCommand {
        async call(message, content) {
            const {
                mentioned_member,
                owner_waifus,
                slots,
            } = await getData(message, content, database, databaseSlots);

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
                waifuId: mentioned_member.user.id,
            });
            if (owner) {
                const owner_member = await message.guild.fetchMember(owner.ownerId);
                if (owner_member) {
                    await message.channel.send(`Oh nu. ${owner_member.toString()} already claimed this beautiful user!`);
                    return;
                }

                await database.deleteMany({ guildId: message.guild.id, ownerId: owner.ownerId });
            }

            await database.insertOne({
                guildId: message.guild.id,
                ownerId: message.author.id,
                waifuId: mentioned_member.user.id,
            });
            await message.channel.send({
                embed: new Discord.RichEmbed()
                    .setColor(CONST.COLOR.PRIMARY)
                    .setAuthor(`Successful claim!!! Deep snug with ${userToString(mentioned_member, true)} incoming!`, mentioned_member.user.avatarURL),
            });
        }
    }).setHelp(new HelpContent().setUsage("<@mention>", "Claim the person you mentioned if not already claimed."));

    waifuCommand.registerSubCommand("unclaim", new class extends BaseCommand {
        async call(message, content) {
            const {
                mentioned_member,
                owner_waifus,
            } = await getData(message, content, database, databaseSlots);

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
                waifuId: mentioned_member.user.id,
            });
            await message.channel.send("Good bye bb :C");
        }
    }).setHelp(new HelpContent().setUsage("<@mention>", "Unclaim the person you mentioned if already claimed."));

    waifuCommand.registerSubCommand("steal", new class extends BaseCommand {
        constructor() {
            super();

            this.cooldown_guild = [];
            this.cooldown_user = [];
        }

        async call(message, content) {
            const {
                mentioned_member,
                owner_waifus,
                all_waifus,
                slots,
            } = await getData(message, content, database, databaseSlots);

            if (slots - owner_waifus.length === 0) {
                await message.channel.send("Stop it. Get some help. You have filled all your waifu slots already!");
                return;
            }

            if (this.cooldown_guild.includes(message.guild.id)) {
                await message.channel.sendTranslated("Whoa whoa not so fast! There's also a little global cooldown.");
                return;
            }
            this.cooldown_guild.push(message.guild.id);
            setTimeout(() => {
                this.cooldown_guild.splice(this.cooldown_guild.indexOf(message.guild.id), 1);
            }, 15 * 1000);

            if (this.cooldown_user.includes(message.author.id)) {
                await message.channel.sendTranslated("Whoa whoa not so fast! Doing this too often in a row will obvi defeat the purpose of the claim command");
                return;
            }
            this.cooldown_user.push(message.author.id);
            setTimeout(() => {
                this.cooldown_user.splice(this.cooldown_user.indexOf(message.guild.id), 1);
            }, 5 * 60 * 1000);

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
                    const owner_member = await message.guild.fetchMember(w.ownerId);
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

            const ownerUser = await message.guild.fetchMember(waifu.ownerId);
            const waifuUser = await message.guild.fetchMember(waifu.waifuId);

            const m1 = await message.channel.send(`${userToString(ownerUser)}'s waifu ${userToString(waifuUser)} just seemed to have appeared nearby. You are quietly approaching them...`);
            await timeout(1000);
            const m2 = await message.channel.send(".");
            await timeout(500);
            await m2.edit("..");
            await timeout(500);
            await m2.edit("...");

            const random = await secureRandom(101);

            await timeout(1500);

            if (random > 92) {
                await database.updateOne({
                    guildId: message.guild.id,
                    waifuId: waifuUser.user.id,
                }, {
                    $set: {
                        ownerId: message.author.id,
                    },
                });
                await m2.edit("... ***ATTACC***", {
                    embed: new Discord.RichEmbed()
                        .setColor(CONST.COLOR.PRIMARY)
                        .setAuthor(`Successful steal!!! ${userToString(waifuUser, true)} now belongs to you!`, waifuUser.user.avatarURL),
                });
                await timeout(60000);
                await m1.delete().catch(() => { /* Do nothing */ });
            } else {
                await m2.edit(`${userToString(waifuUser)} had got wind of your plans and dashed off at the next chance :c`);
                await timeout(60000);
                await m1.delete().catch(() => { /* Do nothing */ });
            }
        }
    }).setHelp(new HelpContent()
        .setUsage("<@mention>", "Steals a random waifu with a chance of 5%. Cooldown: 5 minutes")
        .addParameter("@mention", "The waifu you want to perform actions on"));

    waifuCommand.registerSubCommand("escape", new class extends BaseCommand {
        constructor() {
            super();

            this.cooldown_user = [];
        }

        async call(message) {
            const {
                owner_of_me,
            } = await getData(message, null, database, databaseSlots);

            if (!owner_of_me) {
                await message.channel.send(`You don't... have an owner... BE FREE. FREE AS A BEE. Well..., actually, according to all known laws
of aviation,

there is no way a bee
should be able to fly.

Its wings are too small to get
its fat little body off the ground.

The bee, of course, flies anyway
  
because bees don...`);
                return;
            }

            if (this.cooldown_user.includes(message.author.id)) {
                await message.channel.sendTranslated("Whoa whoa not so fast! Doing this too often in a row will obvi defeat the purpose of this all");
                return;
            }
            this.cooldown_user.push(message.author.id);
            setTimeout(() => {
                this.cooldown_user.splice(this.cooldown_user.indexOf(message.author.id), 1);
            }, 5 * 60 * 1000);

            const ownerUser = await message.guild.fetchMember(owner_of_me.ownerId);

            const m1 = await message.channel.send(`You are out for walkies with your owner, ${userToString(ownerUser)}. You are following them and their orders, preparing for the perfect escape...`);
            await timeout(1000);
            const m2 = await message.channel.send("As if out of nowhere you pull on your leash.");
            await timeout(500);
            await m2.edit("As if out of nowhere you pull on your leash..");
            await timeout(500);
            await m2.edit("As if out of nowhere you pull on your leash...");

            const random = await secureRandom(101);

            await timeout(1500);

            if (random > 92) {
                await database.deleteOne({
                    guildId: message.guild.id,
                    waifuId: message.author.id,
                });
                await message.channel.send("... ***ATTACC***\nThe leash tore and you are dashing off in the free world", {
                    embed: new Discord.RichEmbed()
                        .setColor(CONST.COLOR.PRIMARY)
                        .setAuthor(`Successful escape!!! ${userToString(message.member, true)} is now free!`, message.author.avatarURL),
                });
                await timeout(60000);
                await m1.delete().catch(() => { /* Do nothing */ });
                await m2.delete().catch(() => { /* Do nothing */ });
            } else {
                await message.channel.send(`${userToString(ownerUser)} reacted quickly and grabs you by your arm. "One day..." you mumble to yourself.`);
                await timeout(60000);
                await m1.delete().catch(() => { /* Do nothing */ });
                await m2.delete().catch(() => { /* Do nothing */ });
            }
        }
    }).setHelp(new HelpContent()
        .setUsage("", "Don't like your new owner or would rather be free? Simply run away! ... with a small 5% chance. Cooldown: 5 minutes"));

    waifuCommand.registerSubCommand("trade", new class extends BaseCommand {
        async call(message, content) {
            const {
                mentions,
                owner_waifus,
            } = await getData(message, content, database, databaseSlots);

            if (mentions.members.size !== 2) {
                await message.channel.send("Specify waifu you want to trade, and the waifu you want to have.");
                return;
            }

            const matched = mentions.members;

            let my_waifu = matched.first();
            let other_waifu = matched.last();
            let tmp_waifu = null;

            if (!owner_waifus.some(w => w.waifuId === my_waifu.user.id) && owner_waifus.some(w => w.waifuId === other_waifu.user.id)) {
                tmp_waifu = my_waifu;
                my_waifu = other_waifu;
                other_waifu = tmp_waifu;
            }

            if (message.author.id === my_waifu.user.id ||
                message.author.id === other_waifu.user.id) {
                await message.channel.send("hahahahahahahahahahahaha that's cute, but no");
                return;
            }

            const waifu = owner_waifus.find(w => w.waifuId === my_waifu.user.id);
            if (!waifu) {
                await message.channel.send(`${userToString(my_waifu)} or ${userToString(other_waifu)} can't be traded, because they both don't belong to you! Trade one waifu you own with one you don't!`);
                return;
            }

            const trade_waifu = await database.findOne({
                waifuId: other_waifu.user.id,
                guildId: message.guild.id,
            });
            if (trade_waifu.ownerId === message.author.id) {
                await message.channel.send(`${userToString(other_waifu)} belongs to you. But second @mention should be someone else's waifu.`);
                return;
            }

            const other_owner = await message.guild.fetchMember(trade_waifu.ownerId);
            if (!trade_waifu || !other_owner) {
                await message.channel.send(`${userToString(my_waifu)} can't be traded, because they don't belong to anyone!`);
                return;
            }

            await message.channel.send(`${userToString(other_owner)}, do you agree to trade your ${userToString(other_waifu)} with ${userToString(my_waifu)}? \`yes\`, \`no\`?`);

            const messages = await message.channel.awaitMessages(message => {
                if (message.author.id !== other_owner.user.id) return false;
                if (!/^(yes|no)\b/i.test(message.content)) return false;
                return true;
            }, {
                maxMatches: 1,
                time: 4 * 60 * 1000,
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
                        `**${userToString(message.member)}** :arrow_left: **${userToString(other_waifu)}**`),
            });
        }
    }).setHelp(new HelpContent()
        .setUsage("<@your waifu> <@other waifu>", "Trade `your waifu` with `other waifu`")
        .addParameter("@your waifu", "Must be one of your waifus. This one will be traded")
        .addParameter("@other waifu", "Must be someone's waifu. This is the one you want to get"));

    /** @type {number[]} */
    const prices = new Array(MAX_SLOTS).fill(0);
    let price = 3000;
    for (let i = 3; i < prices.length; i++) {
        prices[i] = price;
        price = Math.ceil(price * 1.25 * 0.01) * 100;
    }

    waifuCommand.registerSubCommand("buyslot", new class extends BaseCommand {
        constructor() {
            super();

            this.cooldown_user = new RateLimiter(TimeUnit.HOUR, 1, 2);
            this.active = new Set;
        }

        async call(message) {
            const user = message.author;
            if (this.active.has(user.id)) return;

            if (this.cooldown_user.test(user.id)) {
                message.channel.send("You can only purchase 2 slots an hour! Wait " + toHumanTime(this.cooldown_user.tryAgainIn(user.id)) + " before you can go again");
                return;
            }

            const { slots } = await getData(message, null, database, databaseSlots);

            if (slots >= MAX_SLOTS) {
                return message.channel.send("You have reached the maximum amount of waifu slots, which is " + MAX_SLOTS + "!");
            }

            const cost = prices[slots]; // slots length is pretty much also the index of the next slot
            const new_slots = slots + 1;

            await purchaseSlots(message, this.active, this.cooldown_user, user, cost, "'Aight! There you go. Who will be your new waifu?", async cost => {
                const [, new_balance] = await Promise.all([
                    databaseSlots.updateOne({ waifuId: user.id }, { $set: { slots: new_slots } }, { upsert: true }),
                    credits.makeTransaction(message.guild, user, -cost, "waifu/slot", "Bought a waifu slot"),
                ]);
                return new_balance;
            });
        }
    }).setHelp(new HelpContent()
        .setDescription("Buy additional waifu slots with Trixie's currency"));

    waifuCommand.registerSubCommand("setslots", new class extends BaseCommand {
        async call(message, content) {
            const member = new MessageMentions(content, message.guild).members.first();
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
                slots,
            } = await getData(message, null, database, databaseSlots);

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setThumbnail(message.author.avatarURL);
            embed.setTitle("Your Waifus");

            if (!owner_waifus.length) {
                embed.setDescription(`No waifus to see here, just dust :(\nYou can get waifus by claiming someone! Use \`${message.prefix}waifu claim\` to get started.`);
            } else {
                let str = "";
                for (const waifu of owner_waifus) {
                    const member = await message.guild.fetchMember(waifu.waifuId);
                    if (!member) continue;
                    str += userToString(member) + "\n";
                }
                embed.setDescription(str);
            }

            if (owner_of_me) {
                const owner = await message.guild.fetchMember(owner_of_me.ownerId);
                if (owner) embed.addField("Owned by", userToString(owner));
            }

            embed.setFooter(`Total Waifus: ${owner_waifus.length} - Available Slots: ${slots - owner_waifus.length}`);
            await message.channel.send({ embed });
        }
    });
};
