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

async function purchaseSlots(message, activeList, cooldown, user, cost, success, handler = async () => { /* Do nothing */ }) {
    const name = await credits.getName(message.guild);

    if (!await credits.canPurchase(user, cost)) {
        message.channel.send(`:atm: You don't have enough ${name.plural} to buy more slots! You need **${credits.getBalanceString(cost, name)}**.`);
        return;
    }

    await message.channel.send(`:atm: The new slot will cost you **${credits.getBalanceString(cost, name)}**. Type either \`buy\` or \`cancel\``);

    activeList.add(user.id);

    const opts = { maxMatches: 1, time: 60000, errors: ["time"] };
    await message.channel.awaitMessages(m => /^(buy|cancel)$/i.test(m.content) && m.author.id === message.author.id, opts)
        .then(async messages => {
            const m = messages.first();
            if (/^buy$/i.test(m.content)) {
                cooldown.testAndAdd(user.id);

                if (!await credits.canPurchase(user, cost)) {
                    message.channel.send(":atm: Somehow your balance went down during the wait to a level where you cannot aford this anymore :/");
                    return;
                }

                const new_balance = await handler(cost);

                message.channel.send(":atm: " + success + " (:yen: new account balance: **" + credits.getBalanceString(new_balance, name) + "**)");
                return;
            }

            message.channel.send("Then not");
        })
        .catch(() => message.channel.send("Time's up. Try again"))
        .then(() => activeList.delete(user.id));
}

module.exports = purchaseSlots;
