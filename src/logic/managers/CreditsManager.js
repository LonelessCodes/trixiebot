const database = require("../../modules/getDatabase");
const secureRandom = require("../../modules/secureRandom");
const { GuildMember } = require("discord.js");

class CreditsManager {
    constructor() {
        this.accounts = database().then(db => db.collection("credits_accounts"));
        this.config = database().then(db => db.collection("credits_config"));
        this.dailies = database().then(db => db.collection("credits_dailies"));
    }

    async getAccount(user) {
        if (user instanceof GuildMember) user = user.user;

        const account = await this.accounts.then(db => db.findOne({ userId: user.id }));

        return account;
    }

    async createAccount(user) {
        if (user instanceof GuildMember) user = user.user;

        let account = await this.getAccount(user);

        if (account) return {
            exists: true,
            account
        };

        account = await this.accounts.then(db => db.insertOne({ userId: user.id, balance: 0 }));

        return {
            exists: false,
            account
        };
    }

    async getBalance(user) {
        const account = await this.getAccount(user);

        if (!account) return;

        return account.balance;
    }

    async incBalance(user, value) {
        if (user instanceof GuildMember) user = user.user;

        await this.accounts.then(db => db.updateOne({ userId: user.id }, { $inc: { balance: value } }));

        return await this.getBalance(user);
    }

    async decBalance(user, value) {
        if (user instanceof GuildMember) user = user.user;

        await this.accounts.then(db => db.updateOne({ userId: user.id }, { $inc: { balance: -value } }));

        return await this.getBalance(user);
    }

    async setBalance(user, value) {
        if (user instanceof GuildMember) user = user.user;

        await this.accounts.then(db => db.updateOne({ userId: user.id }, { $set: { balance: value } }));

        return await this.getBalance(user);
    }

    async canPurchase(user, cost) {
        const balance = await this.getBalance(user);

        return balance !== undefined ? balance >= cost : false;
    }

    async getDailies(user) {
        if (user instanceof GuildMember) user = user.user;

        let lastDaily = await this.dailies.then(db => db.findOne({
            userId: user.id
        }));

        if (lastDaily &&
            lastDaily.lastDaily > new Date(Date.now() - CreditsManager.COOLDOWN)) return {
            dailies: 0,
            streak: 0
        };
        
        if (!lastDaily) lastDaily = {
            streak: 0
        };

        /** @type {number} */
        const dailies = await secureRandom(150, 200);
        const streak = (lastDaily.streak % CreditsManager.MAX_STREAK) + 1;

        await this.dailies.then(db => db.updateOne({
            userId: user.id
        }, { $set: { streak, lastDaily: new Date } }, { upsert: true }));

        return {
            dailies,
            streak
        };
    }

    async getName(guild) {
        const config = await this.config.then(db => db.findOne({ guildId: guild.id }));

        if (!config) return {
            singular: "credit",
            plural: "credits"
        };

        if (!config.plural) config.plural = config.singular; 

        return config.name;
    }

    async setName(guild, singular, plural) {
        await this.config.then(db => db.updateOne({ guildId: guild.id }, {
            $set: {
                name: {
                    plural,
                    singular
                }
            }
        }, { upsert: true }));
    }

    isBonus(streak) {
        return streak === CreditsManager.MAX_STREAK;
    }

    getBalanceString(balance = 0, names, middle) {
        if (balance === 1 || !names.plural) return `${balance.toLocaleString("en")} ${middle ? middle + " " : ""}${names.singular}`;
        else return `${balance.toLocaleString("en")} ${middle ? middle + " " : ""}${names.plural}`;
    }
}

CreditsManager.MAX_STREAK = 5;
CreditsManager.COOLDOWN = 1000 * 3600 * 22; // 22 hours

module.exports = new CreditsManager;
