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

const credits = require("../CreditsManager");
const Translation = require("../../../modules/i18n/Translation").default;
const TranslationMerge = require("../../../modules/i18n/TranslationMerge").default;

// eslint-disable-next-line valid-jsdoc
/**
 * @param {import("../../../../../../TrixieBot/trixiebot/src/util/commands/MessageContext").default} context
 * @param {Set<string>} activeList
 * @param {import("../../../../../../TrixieBot/trixiebot/src/util/commands/RateLimiter").default} cooldown
 * @param {number} cost
 * @param {import("../../../../../../TrixieBot/trixiebot/src/modules/i18n/Translation").default} success
 * @param {(cost: number) => Promise<number>} handler
 */
async function purchaseSlots(
    context,
    activeList,
    cooldown,
    cost,
    success,
    handler
) {
    const name = await credits.getName(context.guild);

    if (!(await credits.canPurchase(context.author, cost))) {
        return new Translation(
            "bank.not_enough",
            ":atm: You don't have enough {{name}} to buy more slots! You need **{{money}}**.",
            {
                name,
                money: credits.getBalanceTrans(cost, name),
            }
        );
    }

    await context.send(
        new Translation("bank.action", ":atm: The new slot will cost you **{{money}}**. Type either `buy` or `cancel`", {
            money: credits.getBalanceTrans(cost, name),
        })
    );

    activeList.add(context.author.id);

    try {
        const messages = await context.channel.awaitMessages(
            m => /^(buy|cancel)$/i.test(m.content) && m.author.id === context.author.id,
            {
                max: 1,
                time: 60000,
                errors: ["time"],
            }
        );

        const m = messages.first();
        if (/^buy$/i.test(m.content)) {
            cooldown.testAndAdd(context.author.id);

            if (!(await credits.canPurchase(context.author, cost))) {
                activeList.delete(context.author.id);
                return new Translation(
                    "bank.unexpected_drop",
                    ":atm: Somehow your balance went down during the wait to a level where you cannot aford this anymore :/"
                );
            }

            const new_balance = await handler(cost);

            activeList.delete(context.author.id);
            return new TranslationMerge(
                success || new Translation("bank.payment_success", ":atm: 'Aight! There you go."),
                new Translation("bank.payment_new_balance", "(:yen: new account balance: **{{money}}**)", {
                    money: credits.getBalanceTrans(new_balance, name),
                })
            );
        }

        activeList.delete(context.author.id);
        return new Translation("bank.payment_abort", "Then not");
    } catch (_) {
        activeList.delete(context.author.id);
        return new Translation("bank.payment_timeout", "Time's up. Try again");
    }
}

module.exports = purchaseSlots;
