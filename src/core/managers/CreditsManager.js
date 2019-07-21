const database = require("../../modules/db/database");
const secureRandom = require("../../modules/random/secureRandom");
// eslint-disable-next-line no-unused-vars
const { GuildMember, User, Guild } = require("discord.js");

class CreditsManager {
    constructor() {
        this.accounts = database().then(db => db.collection("credits_accounts"));
        this.config = database().then(db => db.collection("credits_config"));
        this.dailies = database().then(db => db.collection("credits_dailies"));
        this.transactions = database().then(db => db.collection("credits_transactions")).then(async db => {
            await db.createIndex({ ts: 1 });
            return db;
        });
    }

    /**
     * Get the bank account of a user
     * @param {User} user 
     * @returns {Promise<{ userId: string; balance: number }>}
     */
    async getAccount(user) {
        if (user instanceof GuildMember) user = user.user;

        const account = await this.accounts.then(db => db.findOne({ userId: user.id }));

        return account;
    }

    /**
     * Create a bank account for a user
     * @param {User} user 
     * @returns {Promise<{ exists: boolean; account: { userId: string; balance: number } }>}
     */
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

    /**
     * Get a users balance
     * @param {User} user 
     */
    async getBalance(user) {
        const account = await this.getAccount(user);

        if (!account) return;

        return account.balance;
    }

    /**
     * Raise someone's balance
     * @param {User} user 
     * @param {number} value 
     */
    async incBalance(user, value) {
        if (user instanceof GuildMember) user = user.user;

        await this.accounts.then(db => db.updateOne({ userId: user.id }, { $inc: { balance: value } }));

        return await this.getBalance(user);
    }

    /**
     * Lower someone's balance
     * @param {User} user 
     * @param {number} value
     */
    async decBalance(user, value) {
        if (user instanceof GuildMember) user = user.user;

        await this.accounts.then(db => db.updateOne({ userId: user.id }, { $inc: { balance: -value } }));

        return await this.getBalance(user);
    }


    /**
     * Set someone's balance
     * @param {User} user
     * @param {number} value
     */
    async setBalance(user, value) {
        if (user instanceof GuildMember) user = user.user;

        await this.accounts.then(db => db.updateOne({ userId: user.id }, { $set: { balance: value } }));

        return await this.getBalance(user);
    }

    /**
     * Checks if someone has enough money on the bank to purchase something
     * @param {User} user 
     * @param {number} cost 
     */
    async canPurchase(user, cost) {
        const balance = await this.getBalance(user);

        return balance !== undefined ? balance >= cost : false;
    }

    /**
     * Make a transaction that will be logged to the database and the !bank commands transactions field
     * @param {Guild} guild 
     * @param {User} user 
     * @param {number} cost 
     * @param {string} namespace 
     * @param {string} description 
     */
    async makeTransaction(guild, user, cost, namespace, description) {
        if (user instanceof GuildMember) user = user.user;

        const balance = await this.incBalance(user, cost);

        const timestamp = new Date;
        await this.transactions.then(db => db.insertOne({
            ts: timestamp,
            guildId: guild.id,
            userId: user.id,
            cost,
            balance,
            ns: namespace,
            description
        }));

        return balance;
    }

    /**
     * @param {User} user 
     * @param {string} namespace 
     * @param {number} amount 
     * @returns {{ ts: Date; guildId: string; cost: number; balance: number; ns: string; description: string; }[]}
     */
    async getTransactions(user, namespace, amount) {
        if (user instanceof GuildMember) user = user.user;
        
        if (typeof namespace === "number") {
            amount = namespace;
            namespace = null;
        }

        const query = {
            userId: user.id
        };
        if (namespace) query.namespace = namespace;

        let cursor = await this.transactions.then(db => db.find(query)
            .sort({ ts: -1 })
            .project({ ts: 1, guildId: 1, cost: 1, balance: 1, ns: 1, description: 1 }));
        if (amount) cursor = cursor.limit(amount);
        
        return await cursor.toArray();
    }

    /**
     * Check and get dailies for someone. The dailies have to be added to the bank account manually
     * @param {User} user 
     */
    async getDailies(user) {
        if (user instanceof GuildMember) user = user.user;

        let lastDaily = await this.dailies.then(db => db.findOne({
            userId: user.id
        }));

        /** @type {number} */
        const dailies = await secureRandom([150, 170, 200]);

        if (lastDaily) {
            const time_left = lastDaily.lastDaily.getTime() + CreditsManager.COOLDOWN - Date.now();

            if (time_left > 0) return {
                time_left,
                dailies: 0,
                streak: 0
            };

            else if (time_left < -CreditsManager.STREAK_TIME) {
                await this.dailies.then(db => db.updateOne({
                    userId: user.id
                }, { $set: { streak: 1, lastDaily: new Date } }));

                return {
                    dailies,
                    streak: 1
                };
            }
        }
        
        if (!lastDaily) lastDaily = {
            streak: 0
        };

        const streak = (lastDaily.streak % CreditsManager.MAX_STREAK) + 1;

        await this.dailies.then(db => db.updateOne({
            userId: user.id
        }, { $set: { streak, lastDaily: new Date } }, { upsert: true }));

        return {
            dailies,
            streak
        };
    }

    /**
     * Get the currency name configuration of a guild
     * @param {Guild} guild 
     * @returns {Promise<{ singular: string; plural: string }>}
     */
    async getName(guild) {
        if (!guild) return {
            singular: "credit",
            plural: "credits"
        };

        const config = await this.config.then(db => db.findOne({ guildId: guild.id }));

        if (!config) return {
            singular: "credit",
            plural: "credits"
        };

        if (!config.plural) config.plural = config.singular; 

        return config.name;
    }

    /**
     * Set the currency name configuration of a guild
     * @param {Guild} guild 
     * @param {string} singular 
     * @param {string} plural
     */
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

    /**
     * Checks if a streak is high enough to get a bonus
     * @param {number} streak 
     */
    isBonus(streak) {
        return streak === CreditsManager.MAX_STREAK;
    }

    /**
     * Convert a balance to a univeral string
     * @param {number} balance 
     * @param {{ singular: string; plural: string }} names
     * @param {string} middle 
     */
    getBalanceString(balance = 0, names, middle) {
        if (balance === 1 || !names.plural) return `${balance.toLocaleString("en")} ${middle ? middle + " " : ""}${names.singular}`;
        else return `${balance.toLocaleString("en")} ${middle ? middle + " " : ""}${names.plural}`;
    }
}

CreditsManager.MAX_STREAK = 5;
CreditsManager.COOLDOWN = 1000 * 3600 * 22; // 22 hours
CreditsManager.STREAK_TIME = 1000 * 3600 * 6;

module.exports = new CreditsManager;
