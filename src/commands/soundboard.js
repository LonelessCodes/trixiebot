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

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const RateLimiter = require("../util/commands/RateLimiter");
const TimeUnit = require("../modules/TimeUnit");

const soundboard = require("../core/managers/SoundboardManager");
const SampleID = require("../core/managers/soundboard/SampleID");
const SampleList = require("../core/managers/soundboard/SampleList");
const AudioManager = require("../core/managers/AudioManager");
const credits = require("../core/managers/CreditsManager");
const moment = require("moment");
const { userToString } = require("../util/util");
const { toHumanTime } = require("../util/time");
const log = require("../log").namespace("sb cmd");
const CONST = require("../const");
const Discord = require("discord.js");
const { Guild, User } = Discord;

class ChooseCommand extends TreeCommand {
    constructor() {
        super();

        this.registerSubCommand("user", new SimpleCommand((message, content) => this.user(message, content)));
        this.registerSubCommand("server", new SimpleCommand((message, content) => this.server(message, content))).setCategory(Category.MODERATION);
        this.registerSubCommand("pre", new SimpleCommand((message, content) => this.pre(message, content))).setCategory(Category.OWNER);
        this.registerSubCommandAlias("user", "*");
        this.registerSubCommandAlias("user", "u");
        this.registerSubCommandAlias("server", "s");
        this.registerSubCommandAlias("server", "guild");
        this.registerSubCommandAlias("server", "g");
    }

    user() { /* Do nothing */ }
    server() { /* Do nothing */ }
    pre() { /* Do nothing */ }
}

module.exports = function install(cr) {
    const sbCmd = cr.registerCommand("sb", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Trixie's own soundboard! OOF. There are user soundboards and server soundboards. Means every server can have a local soundboard and every user their own soundboard with sound clips as well.")
            .setUsage("<?sound name|id>", "Play a soundie of the one's available for you in this server")
            .addParameterOptional("sound name", "sound name to play. If omitted, shows list of all available soundclips")
            .addParameterOptional("id", "sound clip id to play instead of sound name"))
        .setCategory(Category.AUDIO);

    sbCmd.registerDefaultCommand(new OverloadCommand)
        .registerOverload("0", new SimpleCommand(async message => {
            const max_slots_user = await soundboard.getSlotsUser(message.author);
            const max_slots_guild = await soundboard.getSlotsGuild(message.guild);

            const samples = await soundboard.getAvailableSamples(message.guild, message.author);

            new SampleList(message.author, message.guild, samples, { user: max_slots_user, guild: max_slots_guild }).display(message.channel);
        }))
        .registerOverload("1+", new SimpleCommand(async (message, content) => {
            let sample = await soundboard.getSample(message.guild, message.author, content.toLowerCase());
            if (!sample) {
                if (!SampleID.isId(content)) {
                    await message.react("❌");
                    return;
                }

                sample = await soundboard.getSampleById(content);
                if (!sample) {
                    await message.react("❌");
                    return;
                }
            }

            try {
                const audio = AudioManager.getGuild(message.guild);
                const connection = await audio.connect(message.member);
                sample.play(connection);

                await message.react("👍");
            } catch (err) {
                await message.react("❌");
                if (err instanceof AudioManager.ConnectError) {
                    message.channel.sendTranslated(err.message);
                    return;
                }
                log.error(err);
                await message.channel.sendTranslated(":x: Some error happened and caused some whoopsies");
            }
        }));

    async function uploadSample(message, user, name, cb) {
        const uploader = soundboard.getSampleUploader(user);

        const m = await message.channel.send(":arrows_counterclockwise: " + uploader.status);

        uploader.once("error", err => m.edit("❌ " + err));

        uploader.on("statusChange", status => m.edit(":arrows_counterclockwise: " + status));

        uploader.once("success", sample => {
            const embed = cb(new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY), sample);
            m.edit("✅ Successfully added!", { embed });
        });

        await uploader.upload(message.attachments.first(), name.toLowerCase())
            .catch(err => {
                log.error(err);
                m.edit(":x: Some error happened and caused some whoopsies");
            });
    }

    sbCmd.registerSubCommand("upload", new class extends ChooseCommand {
        async user(message, name) {
            const slots = await soundboard.getTakenSlotsUser(message.author);
            const max_slots = await soundboard.getSlotsUser(message.author);
            if (slots >= max_slots) {
                await message.channel.send(`❌ You don't have any free slots left in your soundboard. Worry not my child, you can still buy more by typing \`${message.prefix}sb buyslot\``);
                return;
            }

            await uploadSample(message, message.author, name, (embed, sample) => {
                embed.setAuthor(userToString(message.author, true) + " | " + sample.name, message.author.avatarURL);

                embed.addField("Name", sample.name, true);
                embed.addField("ID", sample.id, true);
                return embed;
            });
        }
        async server(message, name) {
            const slots = await soundboard.getTakenSlotsGuild(message.guild);
            const max_slots = await soundboard.getSlotsGuild(message.guild);
            if (slots >= max_slots) {
                await message.channel.send(`❌ You don't have any free slots left in your server's soundboard. Worry not my child, you can still buy more by typing \`${message.prefix}sb buyslot server\``);
                return;
            }

            await uploadSample(message, message.guild, name, (embed, sample) => {
                embed.setAuthor(message.guild.name + " | " + sample.name, message.guild.iconURL);

                embed.addField("Name", sample.name, true);
                embed.addField("ID", sample.id, true);
                return embed;
            });
        }
        async pre(message, name) {
            await uploadSample(message, null, name, (embed, sample) => {
                embed.setAuthor("Predefined Samples | " + sample.name, message.author.avatarURL);

                embed.addField("Name", sample.name, true);
                return embed;
            });
        }
    }).setRateLimiter(new RateLimiter(TimeUnit.MINUTE, 15, 5)).setHelp(new HelpContent()
        .setUsageTitle("Manage Your Soundboards")
        .setUsage("<?scope> <sound name>", "Upload a sound clip to Trixie. Attach the audio file to the message when sending")
        .addParameterOptional("scope", "`user` or `server`")
        .addParameter("sound name", "Name of the new sound clip"));
    sbCmd.registerSubCommandAlias("upload", "u");

    async function importSample(scope, message, user, id, cb) {
        if (!SampleID.isId(id)) {
            await message.channel.send(`❌ \`${id}\` is not a valid sample id. With import you can add other user's samples to your or your server's soundboard, but only if you know the id of that sample. You could ask users with a kewl sample to show you the id with \`${message.prefix}sb info <sample name>\``);
            return;
        }

        const sample = await soundboard.getSampleById(id);
        if (!sample) {
            await message.channel.send("❌ A sample with that id doesn't exist");
            return;
        }

        if (!sample.importable) {
            await message.channel.send("❌ That sample isn't importable :c");
            return;
        }

        switch (scope) {
            case "user":
                if (sample.isOwner(user)) {
                    await message.channel.send("❌ You already have this sample in your soundboard!");
                    return;
                }
                break;
            case "guild":
                if (sample.isGuild(user)) {
                    await message.channel.send("❌ You already have this sample in your guild's soundboard!");
                    return;
                }
                break;
            case "predefined":
                if (await soundboard.getPredefinedSample(sample.name)) {
                    await message.channel.send("❌ You already have a predefined sample with this name!");
                    return;
                }
                break;
        }

        await soundboard.importSample(user, sample);

        const embed = cb(new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY), sample);

        await message.channel.send("✅ Successfully imported!", { embed });
    }

    sbCmd.registerSubCommand("import", new class extends ChooseCommand {
        async user(message, id) {
            const slots = await soundboard.getTakenSlotsUser(message.author);
            const max_slots = await soundboard.getSlotsUser(message.author);
            if (slots >= max_slots) {
                await message.channel.send(`❌ You don't have any free slots left in your soundboard. Worry not my child, you can still buy more by typing \`${message.prefix}sb buyslot\``);
                return;
            }

            await importSample("user", message, message.author, id, (embed, sample) => {
                embed.setAuthor(userToString(message.author, true) + " | " + sample.name, message.author.avatarURL);

                embed.addField("Name", sample.name, true);
                embed.addField("ID", sample.id, true);
                return embed;
            });
        }
        async server(message, id) {
            const slots = await soundboard.getTakenSlotsGuild(message.guild);
            const max_slots = await soundboard.getSlotsGuild(message.guild);
            if (slots >= max_slots) {
                await message.channel.send(`❌ You don't have any free slots left in your server's soundboard. Worry not my child, you can still buy more by typing \`${message.prefix}sb buyslot server\``);
                return;
            }

            await importSample("guild", message, message.guild, id, (embed, sample) => {
                embed.setAuthor(message.guild.name + " | " + sample.name, message.guild.iconURL);

                embed.addField("Name", sample.name, true);
                embed.addField("ID", sample.id, true);
                return embed;
            });
        }
        async pre(message, id) {
            await importSample("predefined", message, null, id, (embed, sample) => {
                embed.setAuthor("Predefined Samples | " + sample.name, message.author.avatarURL);

                embed.addField("Name", sample.name, true);
                return embed;
            });
        }
    }).setRateLimiter(new RateLimiter(TimeUnit.MINUTE, 15, 5)).setHelp(new HelpContent()
        .setUsage("<?scope> <id>", "Import a soundclip from another user or server to your or your server's soundboard. You can get the ID of a soundclip by asking the owner of the clip you want to import to type `{{prefix}}sb info <sound name>`")
        .addParameter("id", "The unique ID of a soundclip"));
    sbCmd.registerSubCommandAlias("import", "i");

    sbCmd.registerSubCommand("delete", new class extends ChooseCommand {
        async user(message, name) {
            const sample = await soundboard.getSampleUser(message.author, name.toLowerCase());
            if (!sample) {
                await message.channel.send("❌ That sample doesn't exist");
                return;
            }

            await soundboard.removeSample(message.author, sample);

            await message.channel.send("✅ Successfully deleted!");
        }
        async server(message, name) {
            const sample = await soundboard.getSampleGuild(message.guild, name.toLowerCase());
            if (!sample) {
                await message.channel.send("❌ That sample doesn't exist");
                return;
            }

            await soundboard.removeSample(message.guild, sample);

            await message.channel.send("✅ Successfully deleted!");
        }
        async pre(message, name) {
            const sample = await soundboard.getPredefinedSample(name.toLowerCase());
            if (!sample) {
                await message.channel.send("❌ That sample doesn't exist");
                return;
            }

            await soundboard.removeSample(null, sample);

            await message.channel.send("✅ Successfully deleted!");
        }
    }).setHelp(new HelpContent()
        .setUsage("<?scope> <sound name>", "Delete a soundclip from your or your server's soundboard.")
        .addParameter("sound name", "The name of the soundclip to delete"));
    sbCmd.registerSubCommandAlias("delete", "d");

    function makeInfoEmbed(user, sample) {
        const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

        if (user instanceof User) {
            embed.setAuthor(userToString(user, true) + "'s Samples | " + sample.name, user.avatarURL);
        } else if (user instanceof Guild) {
            embed.setAuthor(user.name + "'s Samples | " + sample.name, user.iconURL);
        }

        embed.addField("Name", sample.name, true);
        embed.addField("ID", sample.id, true);

        embed.addField("Play Count", sample.plays.toLocaleString("en"));

        embed.addField("Uploaded", moment(sample.created_at).fromNow(), true);
        if (sample.modified_at) embed.addField("Modified", moment(sample.modified_at).fromNow(), true);
        if (sample.last_played_at) embed.addField("Last Played", moment(sample.last_played_at).fromNow(), true);

        return embed;
    }

    sbCmd.registerSubCommand("info", new class extends ChooseCommand {
        async user(message, content) {
            let sample = await soundboard.getSampleUser(message.author, content.toLowerCase());
            if (!sample) {
                if (!SampleID.isId(content)) {
                    await message.channel.send("❌ That sample doesn't exist");
                    return;
                }

                sample = await soundboard.getSampleById(content);
                if (!sample) {
                    await message.channel.send("❌ That sample doesn't exist");
                    return;
                }
            }

            await message.channel.send({ embed: makeInfoEmbed(message.author, sample) });
        }
        async server(message, content) {
            let sample = await soundboard.getSampleGuild(message.guild, content.toLowerCase());
            if (!sample) {
                await message.channel.send("❌ That sample doesn't exist");
                return;
            }

            await message.channel.send({ embed: makeInfoEmbed(message.guild, sample) });
        }
    }).setRateLimiter(new RateLimiter(TimeUnit.MINUTE, 15, 15)).setHelp(new HelpContent()
        .setUsage("<?scope> <sound name|id>", "View info about a sound clip and get it's unique ID, for people to be able to play it as well")
        .addParameter("sound name", "The name of the sound clip to view more info about")
        .addParameter("id", "The id of the sound clip to view more info about instead of sound name"));

    /** @type {number[]} */
    const prices = new Array(soundboard.MAX_SLOTS).fill(0);
    let price = 5000;
    for (let i = soundboard.DEFAULT_SLOTS; i < prices.length; i++) {
        prices[i] = price;
        price = Math.ceil(price * 1.25 * 0.01) * 100;
    }

    async function buyslot(active, cooldown, scope, message) {
        const user = message.author;
        const guild = message.guild;
        const isUser = scope === "user";
        if (active.has(isUser ? user.id : guild.id)) return;

        if (cooldown.test(isUser ? user.id : guild.id)) {
            message.channel.send("You can only purchase 2 slots an hour! Wait " + toHumanTime(cooldown.tryAgainIn(isUser ? user.id : guild.id)) + " before you can go again");
            return;
        }

        const slots = isUser ? await soundboard.getSlotsUser(user) : await soundboard.getSlotsGuild(guild);

        if (slots >= soundboard.MAX_SLOTS) {
            message.channel.send("You have reached the maximum amount of soundboard slots, which is " + soundboard.MAX_SLOTS + "!");
            return;
        }

        const cost = prices[slots]; // slots length is pretty much also the index of the next slot
        const new_slots = slots + 1;

        const name = await credits.getName(message.guild);

        if (!await credits.canPurchase(user, cost)) {
            message.channel.send(`:atm: You don't have enough ${name.plural || name.singular} to buy more slots! You need **${credits.getBalanceString(cost, name)}**.`);
            return;
        }

        await message.channel.send(`:atm: The new slot will cost you **${credits.getBalanceString(cost, name)}**. Type either \`buy\` or \`cancel\``);

        active.add(isUser ? user.id : guild.id);

        message.channel.awaitMessages(m => /^(buy|cancel)$/i.test(m.content) && m.author.id === message.author.id, { maxMatches: 1, time: 60000, errors: ["time"] })
            .then(async messages => {
                const m = messages.first();
                if (/^buy$/i.test(m.content)) {
                    cooldown.testAndAdd(isUser ? user.id : guild.id);

                    if (!await credits.canPurchase(user, cost)) {
                        message.channel.send(":atm: Somehow your balance went down during the wait to a level where you cannot aford this anymore :/");
                        return;
                    }

                    const [, new_balance] = await Promise.all([
                        isUser ? soundboard.setNewSlotsUser(user, new_slots) : soundboard.setNewSlotsGuild(guild, new_slots),
                        credits.makeTransaction(message.guild, user, -cost, "soundboard/slot", isUser ? "Bought a soundboard slot" : "Bought a soundboard slot for server " + guild.name),
                    ]);

                    message.channel.send(":atm: 'Aight! There you go. (:yen: new account balance: **" + credits.getBalanceString(new_balance, name) + "**)");
                    return;
                }

                message.channel.send("Then not");
            })
            .catch(() => message.channel.send("Time's up. Try again"))
            .then(() => active.delete(isUser ? user.id : guild.id));
    }

    sbCmd.registerSubCommand("buyslot", new class extends ChooseCommand {
        constructor() {
            super();

            this.cooldown = {
                user: new RateLimiter(TimeUnit.HOUR, 1, 2),
                guild: new RateLimiter(TimeUnit.HOUR, 1, 2),
            };
            this.active = {
                user: new Set,
                guild: new Set,
            };
        }
        async user(message) {
            await buyslot(this.active.user, this.cooldown.user, "user", message);
        }
        async server(message) {
            await buyslot(this.active.guild, this.cooldown.guild, "guild", message);
        }
    }).setHelp(new HelpContent()
        .setUsageTitle("Buy New Slots")
        .setUsage("<?scope>", "Buy additional soundboard slots with Trixie's currency"));
    sbCmd.registerSubCommandAlias("buyslot", "b");

    cr.registerAlias("sb", "soundboard");
};
