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
const CommandPermissions = require("../util/commands/CommandPermission");

const credits = require("../core/managers/CreditsManager");
const moment = require("moment");
const { userToString } = require("../util/util");
const { basicTEmbed } = require("../modules/i18n/TranslationEmbed");
const { splitArgs } = require("../util/string");
const { toHumanTime } = require("../util/time");
const { timeout } = require("../util/promises");
const PaginatorAction = require("../modules/actions/PaginatorAction");

const Translation = require("../modules/i18n/Translation");
const TranslationMerge = require("../modules/i18n/TranslationMerge");
const TranslationFormatter = require("../modules/i18n/TranslationFormatter");
const NumberFormat = require("../modules/i18n/NumberFormat");
const Resolvable = require("../modules/i18n/Resolvable");

module.exports = function install(cr) {
    const bankCmd = cr.registerCommand("bank", new TreeCommand)
        .setHelp(new HelpContent()
            .setDescription("Trixie's own currency system so you can send, receive, spend, earn credits for additional features or rewards.")
            .setUsage("", "Look at your bank account"))
        .setCategory(Category.ECONOMY);

    bankCmd.registerDefaultCommand(new SimpleCommand(async ({ guild, member, prefix, ctx }) => {
        const account = await credits.getAccount(member);
        if (!account) {
            return new Translation("bank.no_account", "It looks like you haven't opened a bank account yet. How about doing so with `{{prefix}}bank create`", { prefix });
        }

        const embed = basicTEmbed(new Translation("bank.account", "Bank Account"), member);

        embed.addField(
            new Translation("bank.balance", "Balance"),
            new TranslationFormatter("```cs\n{{m}}\n```", { m: credits.getBalanceTrans(account.balance, await credits.getName(guild)) })
        );

        const trans_raw = await credits.getTransactions(member, 5);

        const locale = await ctx.translator();

        if (trans_raw.length > 0) {
            const transactions = [];
            for (let trans of trans_raw) {
                transactions.push({
                    ts: moment(trans.ts).locale(locale.locale).fromNow(),
                    cost: (trans.cost >= 0 ? "+" : "") + Resolvable.resolve(new NumberFormat(trans.cost), locale),
                    description: trans.description,
                });
            }

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

            embed.addField(new Translation("bank.last_transactions", "Last Transactions"), trans_str.join("\n"));
        }

        return embed;
    }));
    bankCmd.registerSubCommandAlias("*", "show");

    bankCmd.registerSubCommand("create", new SimpleCommand(async context => {
        const user = context.author;

        const account = await credits.createAccount(user);

        if (account.exists) {
            let str = new TranslationMerge(new Translation("bank.already_have_account", ":atm: You have already created a bank account!"));
            if (account.account.balance > 0) str.push(new Translation("bank.already_balance", "You even already have **{{money}}**!", { money: credits.getBalanceTrans(account.account.balance, await credits.getName(context.guild)) }));
            return new TranslationMerge(
                str,
                new Translation("bank.start_using", "Get started using your balance to purchase items and unlock features now.")
            ).separator("\n");
        } else {
            return new Translation("bank.account_created", ":atm: Ayy you now have a bank account! Check it out at `{{prefix}}bank`", { prefix: context.prefix });
        }
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Create a bank account to send, receive, spend and earn credits."));
    bankCmd.registerSubCommandAlias("create", "open");

    bankCmd.registerSubCommand("balance", new SimpleCommand(async context => {
        const user = context.author;

        const account = await credits.getAccount(user);
        if (!account) {
            return new Translation("bank.create_first", "Before you can use any money related activities, please create a bank account using `{{prefix}}bank create`", { prefix: context.prefix });
        }

        return new Translation("bank.curr_balance", ":yen: You currently have an account balance of **{{money}}**. oof", { money: credits.getBalanceTrans(account.balance, await credits.getName(context.guild)) });
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Check out the balance on your account!"));

    bankCmd.registerSubCommand("pay", new SimpleCommand(async ({ message, prefix, content }) => {
        const me = message.author;

        const my_account = await credits.getAccount(me);
        if (!my_account) {
            return new Translation("bank.create_first", "Before you can use any money related activities, please create a bank account using `{{prefix}}bank create`", { prefix });
        }

        const other_user = message.mentions.members.first();
        if (!other_user) {
            return new Translation("bank.pay_help", "To pay someone money, you need to tell me *who* I should pay it to. Remember it's `<@user> <amount>`");
        }

        if (other_user.id === me.id) {
            return new Translation("bank.pay_same_user", "Okay, but why should you...");
        }

        const other_account = await credits.getAccount(other_user);
        if (!other_account) {
            return new Translation("bank.pay_user_no_account", "This user didn't open a bank account yet");
        }

        const args = splitArgs(content, 3); // if someone adds the currency name at the end, it should still work

        let amount = 0;
        try {
            amount = parseInt(args[1]);
        } catch (_) {
            return new Translation("bank.pay_invalid_num", "That is not a valid number, bruh! Remember it's `<@user> <amount>`");
        }

        const name = await credits.getName(message.guild);

        if (amount < 10) {
            return new Translation("bank.pay_minimum", "You can only pay someone at least {{money}}", { money: credits.getBalanceTrans(10, name) });
        }

        if (!await credits.canPurchase(me, amount)) {
            return new Translation("bank.pay_not_enough", ":atm: You do not have enough money on your account to pay {{user}} this much", { user: userToString(other_user) });
        }

        await credits.makeTransaction(message.guild, other_user, amount, "pay", `Got money from ${userToString(me, true)}`);
        await credits.makeTransaction(message.guild, me, -amount, "pay", `Sent money to ${userToString(other_user, true)}`);

        return new TranslationFormatter(`💴 **{{money}}**\n${userToString(me)} ▶ ${userToString(other_user)}`, { money: credits.getBalanceTrans(amount, name) });
    }))
        .setHelp(new HelpContent()
            .setUsage("<@user> <cost>", "Pay some other user money")
            .addParameter("@user", "Use to pay money to")
            .addParameter("cost", "Ammount of money to pay"));

    bankCmd.registerSubCommand("transactions", new SimpleCommand(async context => {
        const user = context.author;

        const account = await credits.getAccount(user);
        if (!account) {
            return new Translation("bank.create_first", "Before you can use any money related activities, please create a bank account using `{{prefix}}bank create`", { prefix: context.prefix });
        }

        const trans_raw = await credits.getTransactions(user);

        const locale = await context.translator();

        if (trans_raw.length > 0) {
            const transactions = [];
            for (let trans of trans_raw) {
                transactions.push({
                    ts: moment(trans.ts).locale(locale.locale).fromNow(),
                    cost: (trans.cost >= 0 ? "+" : "") + Resolvable.resolve(new NumberFormat(trans.cost), locale),
                    description: trans.description,
                });
            }

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
                        trans.description);
                }
                items.push("```cs\n" + trans_str.join("\n\n") + "\n```");
            }

            new PaginatorAction(
                new Translation("bank.transactions", "Transactions"),
                new Translation("bank.transactions_desc", "All of {{user}}'s (your) transactions", { user: userToString(user) }),
                items, context.author, { items_per_page: 1 }
            ).display(context.channel, await context.translator());
        } else {
            return new Translation("bank.trans_no_money_yet", "Looks like you didn't earn or spend money yet! Let's start by `{{prefix}}daily`, to earn some munz", { prefix: context.prefix });
        }
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Display all your transactions from ever!"));
    bankCmd.registerSubCommandAlias("transactions", "trans");

    // redo this
    bankCmd.registerSubCommand("setname", new OverloadCommand)
        .registerOverload("0", new SimpleCommand(async context => {
            const name = await credits.getName(context.guild);

            return new TranslationMerge(
                new Translation("bank.name.current", "Current configuration:"),
                "`" + name + "`",
                new Translation("bank.name.example", "Example: **{{example}}**", { example: credits.getBalanceTrans(Math.floor(Math.random() * 50), name) })
            ).separator("\n");
        }))
        .registerOverload("1+", new SimpleCommand(async ({ guild, content }) => {
            if (content.length > 100) return new Translation("bank.name.too_long", "The name of your this currency should be shorter than 100 character");
            if (/`/g.test(content)) return new Translation("bank.name.forbidden_chars", "That name contains forbidden characters that would break me :'c");

            await credits.setName(guild, content);

            return new Translation("bank.name.success", "Nice! \"{{name}}\" set. Try it out now.", { name: content });
        }))
        .setHelp(new HelpContent()
            .setUsage("<?name>", "Change the name of the currency. If not given any arguments, view the current configuration")
            .addParameterOptional("name", "New currency name"))
        .setPermissions(CommandPermissions.ADMIN);

    bankCmd.registerSubCommandAlias("setname", "name");

    /*
     * Owner Commands
     */

    bankCmd.registerSubCommand("set", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(async ({ message, content }) => {
            const member = message.mentions.members.first();
            if (!member) return;

            const account = await credits.getAccount(member);
            if (!account) {
                return "To pay someone money, you need to tell me *who* I should pay it to. Remember it's `<@user> <amount>`";
            }

            const args = splitArgs(content, 3); // if someone adds the currency name at the end, it should still work

            let amount = 0;
            try {
                amount = parseFloat(args[1]);
            } catch (_) {
                return "That is not a valid number, bruh! Remember it's `<@user> <amount>`";
            }

            const old_balance = await credits.getBalance(member);
            const new_balance = await credits.makeTransaction(message.guild, member, amount - old_balance, "set_balance",
                "Balance was set to " + credits.getBalanceString(amount, await credits.getName(message.guild)) + " by " + userToString(message.author, true));

            return "yo :ok_hand: new balance: " + new_balance;
        }))
        .setCategory(Category.OWNER);

    cr.registerCommand("daily", new SimpleCommand(async context => {
        const user = context.author;

        const account = await credits.getAccount(user);
        if (!account) {
            return new Translation("bank.create_first", "Before you can use any money related activities, please create a bank account using `{{prefix}}bank create`", { prefix: context.prefix });
        }

        const { dailies = 0, streak = 0, time_left = 0 } = await credits.getDailies(user);
        if (time_left > 0) {
            const m = await context.send(new Translation("bank.daily_too_soon", ":atm: {{user}}, daily :yen: credits reset in **{{time_left}}**.", { user: userToString(user), time_left: toHumanTime(time_left) }));
            await timeout(1000 * 15);
            m.delete().catch(() => { /* Do nothing */ });
            return;
        }

        const currency_name = await credits.getName(context.guild);

        const bonus = credits.isBonus(streak) ? 150 : 0;
        const total = dailies + bonus;

        await credits.makeTransaction(context.guild, user, total, "dailies", "Collected dailies");

        const str = new TranslationMerge(new Translation("bank.daily", ":atm: {{user}}, you received your :yen: **{{money}}**!", { user: userToString(user), money: credits.getBalanceTrans(dailies, currency_name, "daily") }));

        const bonus_chars = "BONUS".split("");
        for (let i = 0; i < bonus_chars.length; i++) {
            if (i + 1 <= streak) bonus_chars[i] = `***${bonus_chars[i]}***`;
            else bonus_chars[i] = `*${bonus_chars[i]}*`;
        }
        str.push("Streak:   " + bonus_chars.join("   "));

        if (bonus > 0) str.push(new Translation("bank.daily_streak", "You completed a streak and added an extra :yen: **{{bonus}}** (**{{total}}** total)!", { bonus: credits.getBalanceTrans(bonus, currency_name, "bonus"), total: new NumberFormat(total) }));

        return str.separator("\n\n");
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Gather your daily payouts every day and occasionally get bonus money."))
        .setCategory(Category.ECONOMY);
    cr.registerAlias("daily", "dailies");
};
