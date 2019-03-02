const credits = require("../CreditsManager");

async function purchaseSlots(message, activeList, cooldown, user, cost, success, cb = async () => {}) {
    const name = await credits.getName(message.guild);

    if (!(await credits.canPurchase(user, cost))) {
        message.channel.send(`:atm: You don't have enough ${name.plural} to buy more slots! You need **${credits.getBalanceString(cost, name)}**.`);
        return;
    }

    await message.channel.send(`:atm: The new slot will cost you **${credits.getBalanceString(cost, name)}**. Type either \`buy\` or \`cancel\``);

    activeList.add(user.id);

    await message.channel.awaitMessages(m => /^(buy|cancel)$/i.test(m.content) && m.author.id === message.author.id, { max: 1, time: 60000, errors: ["time"] })
        .then(async messages => {
            const m = messages.first();
            if (/^buy$/i.test(m.content)) {
                cooldown.testAndAdd(user.id);

                if (!(await credits.canPurchase(user, cost))) {
                    message.channel.send(":atm: Somehow your balance went down during the wait to a level where you cannot aford this anymore :/");
                    return;
                }
                
                const new_balance = await cb(cost);

                message.channel.send(":atm: " + success + " (:yen: new account balance: **" + credits.getBalanceString(new_balance, name) + "**)");
                return;
            }

            message.channel.send("Then not");
        })
        .catch(() => message.channel.send("Time's up. Try again"))
        .then(() => activeList.delete(user.id));
}

module.exports = purchaseSlots;