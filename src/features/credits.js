const SimpleCommand = require("../class/SimpleCommand");
const TreeCommand = require("../class/TreeCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");
const Permissions = require("../logic/commands/CommandPermission");

const credits = require("../logic/managers/CreditsManager");
const moment = require("moment");
const { splitArgs } = require("../modules/util/string");
const { toHumanTime } = require("../modules/util/time");
const { userToString, timeout, basicEmbed } = require("../modules/util/index");
const Paginator = require("../logic/Paginator");

module.exports = async function install(cr) {
    const bankCmd = cr.register("bank", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Trixie's own currency system so you can send, receive, spend, earn credits for additional features or rewards.")
            .setUsage("", "Look at your bank account"))
        .setCategory(Category.CURRENCY);

    bankCmd.registerDefaultCommand(new SimpleCommand(async message => {
        const member = message.member;

        const account = await credits.getAccount(member);
        if (!account) {
            return await message.channel.send("It looks like you haven't opened a bank account yet. How about doing so with `" + message.guild.config.prefix + "bank create`");
        }

        const embed = basicEmbed("Bank Account", member);

        embed.addField("Balance", "```cs\n" + credits.getBalanceString(account.balance, await credits.getName(message.guild)) + "\n```");

        const trans_raw = await credits.getTransactions(member, 5);

        if (trans_raw.length > 0) {
            const transactions = trans_raw.map(trans => ({
                ts: moment(trans.ts).fromNow(),
                cost: trans.cost >= 0 ?
                    `+${trans.cost.toLocaleString("en")}` :
                    `${trans.cost.toLocaleString("en")}`,
                description: trans.description,
            }));

            const ts_length = Math.max(...transactions.map(trans => trans.ts.length));
            const cost_length = Math.max(...transactions.map(trans => trans.cost.length));

            const trans_str = ["```cs"];
            for (const trans of transactions) {
                trans_str.push(
                    trans.ts + new Array(ts_length - trans.ts.length).fill(" ").join("") + " | " +
                    trans.cost + new Array(cost_length - trans.cost.length).fill(" ").join("") + " | " +
                    trans.description
                );
            }
            trans_str.push("```");

            embed.addField("Last Transactions", trans_str.join("\n"));
        }

        await message.channel.send({ embed });
    }));
    bankCmd.registerSubCommandAlias("*", "show");

    bankCmd.registerSubCommand("create", new SimpleCommand(async message => {
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
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Create a bank account to send, receive, spend and earn credits."));
    bankCmd.registerSubCommandAlias("create", "open");

    bankCmd.registerSubCommand("balance", new SimpleCommand(async message => {
        const user = message.author;

        const account = await credits.getAccount(user);
        if (!account) {
            return await message.channel.send("Before you can use any money related activities, please create a bank account using `" + message.guild.config.prefix + "bank create`");
        }

        await message.channel.send(`:yen: You currently have an account balance of **${credits.getBalanceString(account.balance, await credits.getName(message.guild))}**. oof`);
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Check out the balance on your account!"));

    bankCmd.registerSubCommand("pay", new SimpleCommand(async (message, content) => {
        const me = message.author;

        const my_account = await credits.getAccount(me);
        if (!my_account) {
            return await message.channel.send("Before you can use any money related activities, please create a bank account using `" + message.guild.config.prefix + "bank create`");
        }

        const other_user = message.mentions.members.first();
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

        await credits.makeTransaction(message.guild, other_user, amount, "pay", `Got money from ${userToString(me, true)}`);
        await credits.makeTransaction(message.guild, me, -amount, "pay", `Send money to ${userToString(other_user, true)}`);

        await message.channel.send(`💴 **${credits.getBalanceString(amount, name)}**\n${userToString(me)} ▶ ${userToString(other_user)}`);
    }))
        .setHelp(new HelpContent()
            .setUsage("<@user> <cost>", "Pay some other user money")
            .addParameter("@user", "Use to pay money to")
            .addParameter("cost", "Ammount of money to pay"));

    bankCmd.registerSubCommand("transactions", new SimpleCommand(async message => {
        const user = message.author;

        const account = await credits.getAccount(user);
        if (!account) {
            return await message.channel.send("Before you can use any money related activities, please create a bank account using `" + message.guild.config.prefix + "bank create`");
        }

        const trans_raw = await credits.getTransactions(user);

        if (trans_raw.length > 0) {
            const transactions = trans_raw.map(trans => ({
                ts: moment(trans.ts).fromNow(),
                cost: trans.cost >= 0 ?
                    `+${trans.cost.toLocaleString("en")}` :
                    `${trans.cost.toLocaleString("en")}`,
                description: trans.description,
            }));

            const items = [];
            let len = 10;
            for (let i = 0; i < Math.ceil(transactions.length / 10); i++) {
                const trans_part = transactions.slice(i * len, (i + 1) * len);

                const ts_length = Math.max(...trans_part.map(trans => trans.ts.length));
                const cost_length = Math.max(...trans_part.map(trans => trans.cost.length));

                const trans_str = [];
                for (const trans of trans_part) {
                    trans_str.push(
                        trans.ts + new Array(ts_length - trans.ts.length).fill(" ").join("") + " | " +
                        trans.cost + new Array(cost_length - trans.cost.length).fill(" ").join("") + " | " +
                        trans.description
                    );
                }
                items.push("```cs\n" + trans_str.join("\n\n") + "\n```");
            }

            new Paginator("Transactions", `All of ${userToString(user)}'s (your) transactions`, 1, items, message.author).display(message.channel);
        } else {
            await message.channel.send("Looks like you didn't earn or spend money yet! Let's start by `" + message.guild.config.prefix + "daily`, to earn some munz");
        }
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Display all your transactions from ever!"));    
    bankCmd.registerSubCommandAlias("transactions", "trans");

    bankCmd.registerSubCommand("name", new SimpleCommand(async (message, content) => {
        const guild = message.guild;
        const [singular, plural] = splitArgs(content, 2);

        if (singular === "") {
            const name = await credits.getName(guild);

            return await message.channel.send(`Current configuration:\nSingular: **${name.singular}**\nPlural: **${name.plural}**\n\nExample: **${credits.getBalanceString(Math.floor(Math.random() * 50), name)}**`);
        }

        await credits.setName(guild, singular, plural === "" ? undefined : plural);

        await message.channel.send("Nice! Okay, try it out now");
    }))
        .setHelp(new HelpContent()
            .setUsage("<?singular> <?plural>", "Change the name of the currency. If not given any arguments, view the current configuration")
            .addParameterOptional("singular", "Sets the singular of the currency name")
            .addParameterOptional("plural", "Sets the plural of the currency name. If omitted, singular name will be used for everything"))
        .setPermissions(Permissions.ADMIN);

    bankCmd.registerSubCommand("set", new SimpleCommand(async (message, content) => {
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

        const old_balance = await credits.getBalance(member);
        const new_balance = await credits.makeTransaction(message.guild, member, amount - old_balance, "set_balance",
            "Balance was set to " + credits.getBalanceString(amount, await credits.getName(message.guild)) + " by " + userToString(message.author, true));

        await message.channel.send("yo :ok_hand: new balance: " + new_balance);
    }))
        .setCategory(Category.OWNER);

    cr.register("daily", new SimpleCommand(async message => {
        const user = message.author;

        const account = await credits.getAccount(user);
        if (!account) {
            return await message.channel.send("It looks like you haven't opened a bank account yet. How about doing so with `" + message.guild.config.prefix + "bank create`");
        }

        const { dailies = 0, streak = 0, time_left = 0 } = await credits.getDailies(user);
        if (time_left > 0) {
            const m = await message.channel.send(`:atm: ${userToString(user)}, daily :yen: credits reset in **${toHumanTime(time_left)}**.`);
            await timeout(1000 * 15);
            m.delete().catch(() => { });
            return;
        }

        const currency_name = await credits.getName(message.guild);

        const bonus = credits.isBonus(streak) ? 100 : 0;
        const total = dailies + bonus;

        await credits.makeTransaction(message.guild, user, total, "dailies", "Collected dailies");

        let str = `:atm: ${userToString(user)}, you received your :yen: **${credits.getBalanceString(dailies, currency_name, "daily")}**!\n\nStreak:   `;

        const bonus_chars = "BONUS".split("");
        for (let i = 0; i < bonus_chars.length; i++) {
            if (i + 1 <= streak) bonus_chars[i] = `***${bonus_chars[i]}***`;
            else bonus_chars[i] = `*${bonus_chars[i]}*`;
        }
        str += bonus_chars.join("   ");

        if (bonus > 0) str += `\n\nYou completed a streak and added an extra :yen: **${credits.getBalanceString(bonus, currency_name, "bonus")}** (**${total.toLocaleString("en")}** total)!`;
            
        await message.channel.send(str);
    }))
        .setHelp(new HelpContent()
            .setDescription("Gather your daily payouts every 22 hours and occasionally get bonus money."))
        .setCategory(Category.CURRENCY);
    cr.registerAlias("daily", "dailies");
};