/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

const { userToString, fetchMember, doNothing } = require("../util/util");
const { timeout } = require("../util/promises");
const { splitArgs } = require("../util/string");
const { toHumanTime } = require("../util/time");
const secureRandom = require("../modules/random/secureRandom").default;
const credits = require("../core/managers/CreditsManager");
const purchaseSlots = require("../core/managers/credits/purchaseSlots");
const CONST = require("../const").default;

const SimpleCommand = require("../core/commands/SimpleCommand");
const TreeCommand = require("../core/commands/TreeCommand").default;
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const RateLimiter = require("../util/commands/RateLimiter").default;
const TimeUnit = require("../modules/TimeUnit").default;
const MessageMentions = require("../util/discord/MessageMentions").default;

const Translation = require("../modules/i18n/Translation").default;
const TranslationMerge = require("../modules/i18n/TranslationMerge").default;
const TranslationEmbed = require("../modules/i18n/TranslationEmbed").default;

async function getData(message, content, database, databaseSlots) {
    const mentions = content ? new MessageMentions(content, message) : null;
    const mentioned_member = mentions ? mentions.members.first() : null;

    const all_waifus = await database.find({ guildId: message.guild.id }).toArray();
    for (const row of all_waifus) {
        if (!(await fetchMember(message.guild, row.ownerId))) {
            await database.deleteMany({ guildId: message.guild.id, ownerId: row.ownerId });
        }

        if (!(await fetchMember(message.guild, row.waifuId))) {
            await database.deleteOne({ guildId: message.guild.id, waifuId: row.waifuId });
        }
    }

    const owner_waifus = await database
        .find({
            ownerId: message.author.id,
            guildId: message.guild.id,
        })
        .toArray();

    const owner_of_me = await database.findOne({
        waifuId: message.author.id,
        guildId: message.guild.id,
    });

    const slots = await databaseSlots.get(message.author);

    return {
        mentions,
        mentioned_member,
        owner_waifus,
        owner_of_me,
        all_waifus,
        slots,
    };
}

const DEFAULT_SLOTS = 3;
const MAX_SLOTS = 15;

// Database
// { ownerId,
//   waifuId,
//   guildId }

module.exports = function install(cr, { db }) {
    const database = db.collection("waifu");
    const databaseSlots = db.slots.register("waifu", DEFAULT_SLOTS, MAX_SLOTS);

    const waifuCommand = cr
        .registerCommand("waifu", new TreeCommand())
        .setHelp(
            new HelpContent()
                .setDescription("This tool helps you manage your waifus with ease!")
                .setUsage("", "Show all waifus you have claimed")
        )
        .setCategory(Category.FUN);

    /**
     * SUB COMMANDS
     */

    waifuCommand
        .registerSubCommand(
            "claim",
            new SimpleCommand(async ({ message, content }) => {
                const { mentioned_member, owner_waifus, slots } = await getData(message, content, database, databaseSlots);

                if (!mentioned_member) {
                    return new Translation("waifu.claim.no_mention", "Must mention your dream waifu!");
                }

                if (message.author.id === mentioned_member.user.id) {
                    return new Translation("waifu.same", "hahahahahahahahahahahaha that's cute, but no");
                }

                if (slots - owner_waifus.length === 0) {
                    return new Translation(
                        "waifu.slots_full",
                        "Stop it. Get some help. You have filled all your waifu slots already!"
                    );
                }

                if (owner_waifus.some(row => row.waifuId === mentioned_member.user.id)) {
                    return new Translation("waifu.claim.already_have", "Bruh. You already have this lad owo");
                }

                const owner = await database.findOne({
                    guildId: message.guild.id,
                    waifuId: mentioned_member.user.id,
                });
                if (owner) {
                    const owner_member = await fetchMember(message.guild, owner.ownerId);
                    if (owner_member) {
                        return new Translation(
                            "waifu.claim.already_claimed",
                            "Oh nu. {{user}} already claimed this beautiful user!",
                            { user: userToString(owner_member) }
                        );
                    }

                    await database.deleteMany({ guildId: message.guild.id, ownerId: owner.ownerId });
                }

                await database.insertOne({
                    guildId: message.guild.id,
                    ownerId: message.author.id,
                    waifuId: mentioned_member.user.id,
                });

                return new TranslationEmbed().setColor(CONST.COLOR.PRIMARY).setAuthor(
                    new Translation("waifu.claim.success", "Successful claim!!! Deep snug with {{user}} incoming!", {
                        user: userToString(mentioned_member, true),
                    }),
                    mentioned_member.user.avatarURL({ size: 32, dynamic: true })
                );
            })
        )
        .setHelp(new HelpContent().setUsage("<@mention>", "Claim the person you mentioned if not already claimed."));

    waifuCommand
        .registerSubCommand(
            "unclaim",
            new SimpleCommand(async ({ message, content }) => {
                const { mentioned_member, owner_waifus } = await getData(message, content, database, databaseSlots);

                if (!mentioned_member) {
                    return new Translation("waifu.unclaim.no_mention", "Must mention your waifu");
                }

                if (!owner_waifus.find(row => row.waifuId === mentioned_member.user.id)) {
                    return new Translation("waifu.unclaim.doesnt_exist", "Never had this hun to begin with :v");
                }

                await database.deleteOne({
                    guildId: message.guild.id,
                    ownerId: message.author.id,
                    waifuId: mentioned_member.user.id,
                });

                return new Translation("waifu.unclaim.success", "Good bye bb :C");
            })
        )
        .setHelp(new HelpContent().setUsage("<@mention>", "Unclaim the person you mentioned if already claimed."));

    const steal_cooldown_guild = [];
    const steal_cooldown_user = [];

    waifuCommand
        .registerSubCommand(
            "steal",
            new SimpleCommand(async ({ message, prefix, content, ctx }) => {
                const { mentioned_member, owner_waifus, all_waifus, slots } = await getData(
                    message,
                    content,
                    database,
                    databaseSlots
                );

                if (slots - owner_waifus.length === 0) {
                    return new Translation(
                        "waifu.slots_full",
                        "Stop it. Get some help. You have filled all your waifu slots already!"
                    );
                }

                if (steal_cooldown_guild.includes(message.guild.id)) {
                    return new Translation(
                        "waifu.steal.cooldown_global",
                        "Whoa whoa not so fast! There's also a little global cooldown."
                    );
                }
                steal_cooldown_guild.push(message.guild.id);
                setTimeout(() => steal_cooldown_guild.splice(steal_cooldown_guild.indexOf(message.guild.id), 1), 15 * 1000);

                if (steal_cooldown_user.includes(message.author.id)) {
                    return new Translation(
                        "waifu.steal.cooldown",
                        "Whoa whoa not so fast! Doing this too often in a row will obvi defeat the purpose of the claim command"
                    );
                }
                steal_cooldown_user.push(message.author.id);
                setTimeout(() => steal_cooldown_user.splice(steal_cooldown_user.indexOf(message.guild.id), 1), 5 * 60 * 1000);

                let waifu;
                if (!mentioned_member) {
                    let pending = 100;
                    while (!waifu && pending--) {
                        /** @type {any} */
                        const random = await secureRandom(all_waifus);
                        if (
                            random.waifuId !== message.author.id &&
                            random.ownerId !== message.author.id &&
                            message.guild.members.cache.has(random.waifuId)
                        )
                            waifu = random;
                    }
                } else {
                    if (message.author.id === mentioned_member.user.id) {
                        return new Translation("waifu.same", "hahahahahahahahahahahaha that's cute, but no");
                    }

                    const w = await database.findOne({ waifuId: mentioned_member.user.id, guildId: message.guild.id });

                    if (w) {
                        const owner_member = await fetchMember(message.guild, w.ownerId);
                        if (owner_member) {
                            waifu = w;
                        } else {
                            await database.deleteMany({ guildId: message.guild.id, ownerId: w.ownerId });
                            return new Translation(
                                "waifu.steal.not_claimed_yet",
                                "This waifu has not been claimed yet. Use `{{prefix}}waifu claim @ {{user}}` to call them your own!",
                                { prefix, user: mentioned_member.displayName }
                            );
                        }
                    } else {
                        return new Translation(
                            "waifu.steal.not_claimed_yet",
                            "This waifu has not been claimed yet. Use `{{prefix}}waifu claim @ {{user}}` to call them your own!",
                            { prefix, user: mentioned_member.displayName }
                        );
                    }
                }

                if (!waifu) {
                    return new Translation("waifu.steal.no_waifu", "No waifu around to steal ;n;");
                }

                const ownerUser = await fetchMember(message.guild, waifu.ownerId);
                const waifuUser = await fetchMember(message.guild, waifu.waifuId);

                const m1 = await ctx.send(
                    new Translation(
                        "waifu.steal.story",
                        "{{owner}}'s waifu {{waifu}} just seemed to have appeared nearby. You are quietly approaching them...",
                        { owner: userToString(ownerUser), waifu: userToString(waifuUser) }
                    )
                );
                await timeout(1000);
                const m2 = await message.channel.send(".");
                await timeout(500);
                await m2.edit("..");
                await timeout(500);
                await m2.edit("...");

                const random = await secureRandom(101);

                await timeout(1500);

                if (random > 95) {
                    await database.updateOne(
                        {
                            guildId: message.guild.id,
                            waifuId: waifuUser.user.id,
                        },
                        {
                            $set: {
                                ownerId: message.author.id,
                            },
                        }
                    );
                    await ctx.edit(
                        m2,
                        "... ***ATTACC***",
                        new TranslationEmbed().setColor(CONST.COLOR.PRIMARY).setAuthor(
                            new Translation("waifu.steal.success", "Successful steal!!! {{user}} now belongs to you!", {
                                user: userToString(waifuUser, true),
                            }),
                            waifuUser.user.avatarURL({ size: 32, dynamic: true })
                        )
                    );
                } else {
                    await ctx.edit(
                        m2,
                        new Translation(
                            "waifu.steal.failed",
                            "{{user}} had got wind of your plans and dashed off at the next chance :c",
                            { user: userToString(waifuUser) }
                        )
                    );
                }
                await m1.delete({ timeout: 60000 }).catch(doNothing);
            })
        )
        .setHelp(
            new HelpContent()
                .setUsage("<@mention>", "Steals a random waifu with a chance of 5%. Cooldown: 5 minutes")
                .addParameter("@mention", "The waifu you want to perform actions on")
        );

    const escape_cooldown_user = [];

    waifuCommand
        .registerSubCommand(
            "escape",
            new SimpleCommand(async ({ message, ctx }) => {
                const { owner_of_me } = await getData(message, null, database, databaseSlots);

                if (!owner_of_me) {
                    return new Translation("waifu.escape.no_owner", "You don't... have an owner... BE FREE.");
                }

                if (escape_cooldown_user.includes(message.author.id)) {
                    return new Translation(
                        "waifu.escape.cooldown",
                        "Whoa whoa not so fast! Doing this too often in a row will obvi defeat the purpose of this all"
                    );
                }
                escape_cooldown_user.push(message.author.id);
                setTimeout(() => escape_cooldown_user.splice(escape_cooldown_user.indexOf(message.author.id), 1), 5 * 60 * 1000);

                const ownerUser = await fetchMember(message.guild, owner_of_me.ownerId);

                const m1 = await ctx.send(
                    new Translation(
                        "waifu.escape.story",
                        "You are out for walkies with your owner, {{owner}}. You are following them and their orders, preparing for the perfect escape...",
                        { owner: userToString(ownerUser) }
                    )
                );
                await timeout(1000);
                const m = new Translation("waifu.escape.story2", "As if out of nowhere you pull on your leash.");
                const m2 = await ctx.send(m);
                await timeout(500);
                await ctx.edit(m2, new TranslationMerge(m, ".").separator(""));
                await timeout(500);
                await ctx.edit(m2, new TranslationMerge(m, "..").separator(""));

                const random = await secureRandom(101);

                await timeout(1500);

                if (random > 95) {
                    await database.deleteOne({
                        guildId: message.guild.id,
                        waifuId: message.author.id,
                    });
                    await ctx.send(
                        new TranslationMerge(
                            "... ***ATTACC***",
                            new Translation("waifu.escape.success1", "The leash tore and you are dashing off in the free world")
                        ).separator("\n"),
                        new TranslationEmbed().setColor(CONST.COLOR.PRIMARY).setAuthor(
                            new Translation("waifu.escape.success2", "Successful escape!!! {{user}} is now free!", {
                                user: userToString(message.member, true),
                            }),
                            message.author.avatarURL({ size: 32, dynamic: true })
                        )
                    );
                } else {
                    await ctx.send(
                        new Translation(
                            "waifu.escape.failed",
                            '{{user}} reacted quickly and grabs you by your arm. "One day..." you mumble to yourself.',
                            { user: userToString(ownerUser) }
                        )
                    );
                }
                await timeout(60000);
                await m1.delete().catch(doNothing);
                await m2.delete().catch(doNothing);
            })
        )
        .setHelp(
            new HelpContent().setUsage(
                "",
                "Don't like your new owner or would rather be free? Simply run away! ... with a small 5% chance. Cooldown: 5 minutes"
            )
        );

    /** @type {number[]} */
    const prices = new Array(MAX_SLOTS).fill(0);
    let price = 3000;
    for (let i = 3; i < prices.length; i++) {
        prices[i] = price;
        price = Math.ceil(price * 1.25 * 0.01) * 100;
    }

    const buy_cooldown_user = new RateLimiter(TimeUnit.HOUR, 1, 2);
    const buy_active = new Set();

    waifuCommand
        .registerSubCommand(
            "buyslot",
            new SimpleCommand(async ({ message, ctx }) => {
                const user = message.author;
                if (buy_active.has(user.id)) return;

                if (buy_cooldown_user.test(user.id)) {
                    return new Translation(
                        "waifu.buy.cooldown",
                        "You can only purchase 2 slots an hour! Wait {{time}} before you can go again",
                        { time: toHumanTime(buy_cooldown_user.tryAgainIn(user.id)) }
                    );
                }

                const { slots } = await getData(message, null, database, databaseSlots);

                if (slots >= MAX_SLOTS) {
                    return new Translation(
                        "waifu.buy.max_slots",
                        "You have reached the maximum amount of waifu slots, which is {{slots}}!",
                        { slots: MAX_SLOTS }
                    );
                }

                const cost = prices[slots]; // slots length is pretty much also the index of the next slot

                return await purchaseSlots(
                    ctx,
                    buy_active,
                    buy_cooldown_user,
                    cost,
                    new Translation("waifu.buy.success", "'Aight! There you go. Who will be your new waifu?"),
                    async cost => {
                        const [, new_balance] = await Promise.all([
                            databaseSlots.add(user),
                            credits.makeTransaction(message.guild, user, -cost, "waifu/slot", "Bought a waifu slot"),
                        ]);
                        return new_balance;
                    }
                );
            })
        )
        .setHelp(new HelpContent().setUsage("", "Buy additional waifu slots with Trixie's currency"));

    waifuCommand
        .registerSubCommand(
            "setslots",
            new SimpleCommand(async ({ mentions, content }) => {
                const member = mentions.members.first();
                if (!member) return;

                const v = splitArgs(content, 2);

                const slots = parseInt(v[1]);
                if (Number.isNaN(slots)) return;

                await databaseSlots.set(member, slots);

                return "yo :ok_hand:";
            })
        )
        .setCategory(Category.OWNER);

    waifuCommand.registerDefaultCommand(
        new SimpleCommand(async ({ message, prefix }) => {
            const { owner_waifus, owner_of_me, slots } = await getData(message, null, database, databaseSlots);

            const embed = new TranslationEmbed().setColor(CONST.COLOR.PRIMARY);
            embed.setThumbnail(message.author.avatarURL({ size: 256, dynamic: true }));
            embed.setTitle(new Translation("waifu.your_waifus", "Your Waifus"));

            if (!owner_waifus.length) {
                embed.setDescription(
                    new Translation(
                        "waifu.no_waifus",
                        "No waifus to see here, just dust :(\nYou can get waifus by claiming someone! Use `{{prefix}}waifu claim` to get started.",
                        { prefix }
                    )
                );
            } else {
                let str = "";
                for (const waifu of owner_waifus) {
                    const member = await fetchMember(message.guild, waifu.waifuId);
                    if (!member) continue;
                    str += userToString(member) + "\n";
                }
                embed.setDescription(str);
            }

            if (owner_of_me) {
                const owner = await fetchMember(message.guild, owner_of_me.ownerId);
                if (owner) embed.addField(new Translation("waifu.owned_by", "Owned by"), userToString(owner));
            }

            embed.setFooter(
                new Translation("waifu.footer", "Total Waifus: {{waifus}} - Available Slots: {{slots}}", {
                    waifus: owner_waifus.length,
                    slots: slots - owner_waifus.length,
                })
            );

            return embed;
        })
    );
};
