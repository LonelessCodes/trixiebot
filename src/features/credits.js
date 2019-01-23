const BaseCommand = require("../class/BaseCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");
const Permissions = require("../logic/commands/CommandPermission");

const credits = require("../logic/managers/CreditsManager");
const { splitArgs } = require("../modules/util/string");
const { userToString } = require("../modules/util/index");
const CONST = require("../modules/CONST");
const Discord = require("discord.js");

module.exports = async function install(cr) {
    const bankCmd = cr.register("bank", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Trixie's own currency system so you can send, receive, spend, earn credits for additional features or rewards.")
            .setUsage("", "Look at your bank account"))
        .setCategory(Category.CURRENCY);

    bankCmd.registerSubCommand("create", new class extends BaseCommand {
        async call(message) {
            const user = message.author;

            const account = await credits.createAccount(user);

            if (account.exists) {
                let str = ":atm: You have already created a bank account!";
                if (account.account.balance > 0) str += ` You even already have **${credits.getBalanceString(account.account.balance, await credits.getName(message.guild))}**!`;
                str += "\nGet started using your balance to purchase items and unlock features now.";
                await message.channel.send(str);
            } else {
                await message.channel.send(":atm: Ayy you now have a bank account! Check it out at `" + message.guild.config.prefix + "bank`");
            }
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Create a bank account to send, receive, spend and earn credits."));
    bankCmd.registerSubCommandAlias("create", "open");

    bankCmd.registerSubCommand("balance", new class extends BaseCommand {
        async call(message) {
            const user = message.author;

            const account = await credits.getAccount(user);
            if (!account) {
                return await message.channel.send("Before you can use any money related activities, please create a bank account using `" + message.guild.config.prefix + "bank create`");
            }

            await message.channel.send(`:yen: You currently have an account balance of **${credits.getBalanceString(account.balance, await credits.getName(message.guild))}**. oof`);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Check out the balance on your account!"));

    bankCmd.registerSubCommand("pay", new class extends BaseCommand {
        async call(message, content) {
            const me = message.author;

            const my_account = await credits.getAccount(me);
            if (!my_account) {
                return await message.channel.send("Before you can use any money related activities, please create a bank account using `" + message.guild.config.prefix + "bank create`");
            }

            const other_user = message.alt_mentions.members.first();
            if (!other_user) {
                return await message.channel.send("To pay someone money, you need to tell me *who* I should pay it to. Remember it's `<@user> <amount>`");
            }

            if (other_user.id === me.id) {
                return await message.channel.send("Okay, but why should you...");
            }

            const other_account = await credits.getAccount(other_user);
            if (!other_account) {
                return await message.channel.send("This user didn't open a bank account yet");
            }

            const args = splitArgs(content, 3); // if someone adds the currency name at the end, it should still work

            let amount = 0;
            try {
                amount = parseFloat(args[1]);
            } catch (_) {
                return await message.channel.send("That is not a valid number, bruh! Remember it's `<@user> <amount>`");
            }

            const name = await credits.getName(message.guild);

            if (amount < 10) {
                return await message.channel.send("You can only pay someone at least 10 " + name.plural);
            }

            if (!(await credits.canPurchase(me, amount))) {
                return await message.channel.send(":atm: You do not have enough money on your account to pay " + userToString(other_user) + " this much");
            }

            await credits.incBalance(other_user, amount);
            await credits.decBalance(me, amount);

            await message.channel.send(`💴 **${credits.getBalanceString(amount, name)}**\n${userToString(me)} ▶ ${userToString(other_user)}`);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Pay some other user money")
            .setUsage("<@user> <cost>")
            .addParameter("@user", "Use to pay money to")
            .addParameter("cost", "Ammount of money to pay"));

    bankCmd.registerSubCommand("name", new class extends BaseCommand {
        async call(message, content) {
            const guild = message.guild;
            const [singular, plural] = splitArgs(content, 2);

            if (singular === "") {
                const name = await credits.getName(guild);

                return await message.channel.send(`Current configuration:\nSingular: **${name.singular}**\nPlural: **${name.plural}**\n\nExample: **${credits.getBalanceString(Math.floor(Math.random() * 50), name)}**`);
            }

            await credits.setName(guild, singular, plural === "" ? undefined : plural);

            await message.channel.send("Nice! Okay, try it out now");
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Change the name of the currency")
            .setUsage("<?singular> <?plural>", "If not given any arguments, view the current configuration")
            .addParameterOptional("singular", "Sets the singular of the currency name")
            .addParameterOptional("plural", "Sets the plural of the currency name. If omitted, singular name will be used for everything"))
        .setPermissions(Permissions.ADMIN);

    bankCmd.registerSubCommand("set", new class extends BaseCommand {
        async call(message, content) {
            const member = message.mentions.members.first();
            if (!member) return;

            const account = await credits.getAccount(member);
            if (!account) {
                return await message.channel.send("To pay someone money, you need to tell me *who* I should pay it to. Remember it's `<@user> <amount>`");
            }

            const args = splitArgs(content, 3); // if someone adds the currency name at the end, it should still work

            let amount = 0;
            try {
                amount = parseFloat(args[1]);
            } catch (_) {
                return await message.channel.send("That is not a valid number, bruh! Remember it's `<@user> <amount>`");
            }

            const new_balance = await credits.setBalance(member, amount);

            await message.channel.send("yo :ok_hand: new balance: " + new_balance);
        }
    })
        .setCategory(Category.OWNER);

    bankCmd.registerDefaultCommand(new class extends BaseCommand {
        async call(message) {
            const member = message.member;

            const account = await credits.getAccount(member);
            if (!account) {
                return await message.channel.send("It looks like you haven't opened a bank account yet. How about doing so with `" + message.guild.config.prefix + "bank create`");
            }

            const embed = new Discord.RichEmbed().setColor(CONST.COLOR.PRIMARY);

            embed.setAuthor(userToString(member, true) + "'s Bank Account", member.user.avatarURL);

            embed.addField("Balance", credits.getBalanceString(account.balance, await credits.getName(message.guild)));

            await message.channel.send({ embed });
        }
    });
    bankCmd.registerSubCommandAlias("*", "show");

    cr.register("daily", new class extends BaseCommand {
        async call(message) {
            const user = message.author;

            const account = await credits.getAccount(user);
            if (!account) {
                return await message.channel.send("It looks like you haven't opened a bank account yet. How about doing so with `" + message.guild.config.prefix + "bank create`");
            }

            const { dailies = 0, streak = 0 } = await credits.getDailies(user);
            if (dailies === 0) return;

            const currency_name = await credits.getName(message.guild);

            const bonus = credits.isBonus(streak) ? 100 : 0;
            const total = dailies + bonus;

            await credits.incBalance(user, total);

            let str = `:atm: ${userToString(user)}, you received your :yen: **${credits.getBalanceString(dailies, currency_name, "daily")}**!\n\nStreak:   `;

            const bonus_chars = "BONUS".split("");
            for (let i = 0; i < bonus_chars.length; i++) {
                if (i + 1 <= streak) bonus_chars[i] = `***${bonus_chars[i]}***`;
                else bonus_chars[i] = `*${bonus_chars[i]}*`;
            }
            str += bonus_chars.join("   ");

            if (bonus > 0) str += `\n\nYou completed a streak and added an extra :yen: **${credits.getBalanceString(bonus, currency_name, "bonus")}** (**${total.toLocaleString("en")}** total)!`;
            
            await message.channel.send(str);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Gather your daily payouts every 22 hours and occasionally get bonus money."))
        .setCategory(Category.CURRENCY);
    cr.registerAlias("daily", "dailies");
};