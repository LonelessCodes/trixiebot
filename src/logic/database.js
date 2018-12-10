module.exports = new class DatabaseHelp {
    // waifus

    async getAllWaifus(db, guildId) {
        const database = db.collection("waifu");
        return await database.find({ guildId }).toArray();
    }

    async getWaifusOfOwner(db, guildId, ownerId) {
        const database = db.collection("waifu");
        return await database.find({
            ownerId,
            guildId
        }).toArray();
    }

    async getWaifu(db, guildId, waifuId) {
        const database = db.collection("waifu");
        return await database.findOne({
            waifuId,
            guildId
        });
    }

    async deleteWaifusOfOwner(db, guildId, ownerId) {
        const database = db.collection("waifu");
        return await database.deleteMany({ guildId, ownerId });
    }

    async addWaifu(db, guildId, ownerId, waifuId) {
        const database = db.collection("waifu");
        return await database.insertOne({
            guildId,
            ownerId,
            waifuId
        });
    }

    async deleteWaifu(db, guildId, ownerId, waifuId) {
        const database = db.collection("waifu");
        return await database.deleteOne({
            guildId,
            ownerId,
            waifuId
        });
    }

    async updateWaifuOwner(db, guildId, waifuId, newOwnerId) {
        const database = db.collection("waifu");
        return await database.updateOne({
            guildId,
            waifuId,
        }, {
            $set: {
                ownerId: newOwnerId
            }
        });
    }

    // roles

    async getAllRoles(db, guildId) {
        const database = db.collection("roles");
        return await database.find({
            guildId
        }).toArray();
    }

    async getRole(db, guildId, roleId) {
        const database = db.collection("roles");
        return await database.findOne({
            guildId,
            roleId
        });
    }

    async addRole(db, guildId, roleId, category) {
        const database = db.collection("roles");
        return await database.updateOne({
            guildId,
            roleId
        }, {
            $set: {
                category
            }
        }, { upsert: true });
    }

    async deleteRole(db, guildId, roleId) {
        const database = db.collection("roles");
        return await database.deleteOne({
            guildId,
            roleId
        });
    }

    // poll

    async hasPollInChannel(db, guildId, channelId) {
        const database = db.collection("poll");
        return (await database.findOne({
            guildId,
            channelId
        }));
    }

    async addPoll(db, guildId, channelId, creatorId, votes, users, endDate) {
        const database = db.collection("poll");
        return await database.insertOne({
            guildId,
            channelId,
            creatorId,
            votes,
            users,
            endDate
        });
    }

    async deletePoll(db, guildId, channelId) {
        const database = db.collection("poll");
        return await database.deleteOne({
            guildId,
            channelId
        });
    }

    async addPollVote(db, guildId, channelId, votes, users) {
        const database = db.collection("poll");
        return database.updateOne({
            guildId,
            channelId
        }, {
            $set: {
                votes,
                users
            }
        });
    }

    async getAllPolls(db) {
        const database = db.collection("poll");
        return await database.find({}).toArray();
    }

    async deletePollById(db, _id) {
        const database = db.collection("poll");
        return await database.deleteOne({ _id });
    }

    // penis

    async getPenis(db, userId) {
        const database = db.collection("penis");
        return await database.findOne({ userId });
    }

    async addPenis(db, userId, girth, length) {
        const database = db.collection("penis");
        return await database.insertOne({
            userId,
            girth,
            length
        });
    }

    async getAllPenises(db, guild) {
        const database = db.collection("penis");
        return await database.find({ $or: guild.members.array().map(member => ({ userId: member.user.id })) }).toArray();
    }

    // alert

    async getAllAlertsStream(db) {
        const database = db.collection("alert");
        return database.find({});
    }

    async deleteAlert(db, service, guildId, userId) {
        const database = db.collection("alert");
        return await database.deleteOne({
            service,
            guildId,
            userId,
        });
    }

    async setAlertMessageIdNull(db, service, guildId, userId) {
        const database = db.collection("alert");
        return await database.updateOne({
            service,
            guildId,
            userId
        }, {
            $set: {
                messageId: null
            }
        });
    }

    async updateAlertMessageId(db, service, guildId, userId, name, messageId) {
        const database = db.collection("alert");
        return await database.updateOne({
            service,
            guildId,
            userId
        }, {
            $set: {
                name,
                messageId
            }
        });
    }

    async getAlertConfig(db, service, guildId, userId) {
        const database = db.collection("alert");
        return await database.findOne({
            service,
            guildId,
            userId
        });
    }

    async deleteAlertById(db, _id) {
        const database = db.collection("alert");
        return await database.deleteOne({ _id });
    }

    async getAllAlertsByGuild(db, guildId) {
        const database = db.collection("alert");
        return await database.find({
            guildId
        }).toArray();
    }

    async addAlertConfig(db, service, guildId, channelId, userId, name) {
        const database = db.collection("alert");
        return await database.insertOne({
            service,
            guildId,
            channelId,
            userId,
            name,
            messageId: null
        });
    }

    // fuck

    async hasFuckText(db, text) {
        const database = db.collection("fuck");
        return await database.findOne({ lowercase: text.toLowerCase() });
    }

    async addFuck(db, text, author) {
        const database = db.collection("fuck");
        return await database.insertOne({
            text,
            lowercase: text.toLowerCase(),
            author: author.tag,
            authorId: author.id
        });
    }

    async getAllFucks(db) {
        const database = db.collection("fuck");
        return database.find({}).toArray();
    }

    // autoban

    async getAllAutobans(db, guildId) {
        const database = db.collection("autoban");
        return await database.find({ guildId }).toArray();
    }

    async addAutoban(db, guildId, pattern) {
        const database = db.collection("autoban");
        return await database.insertOne({ guildId, action: "ban", pattern });
    }

    async deleteAutoban(db, guildId, pattern) {
        const database = db.collection("autoban");
        return await database.deleteOne({ guildId, pattern });
    }

    // deleted messages

    async addDeletedMessage(db, guildId, memberId, channelId, message, timestamp) {
        const database = db.collection("deleted_messages");
        return await database.insertOne({
            guildId,
            memberId,
            channelId,
            message,
            timestamp: new Date(timestamp)
        });
    }

    async pruneDeletedMessages(db) {
        const database = db.collection("deleted_messages");
        return await database.deleteMany({ timestamp: { $lt: new Date(Date.now() - 7 * 24 * 3600 * 1000) } });
    }

    async clearDeletedMessages(db, guildId) {
        const database = db.collection("deleted_messages");
        return await database.deleteMany({ guildId });
    }

    async countDeletedMessages(db, guildId) {
        const database = db.collection("deleted_messages");
        return await database.countDocuments({ guildId });
    }

    async getDeletedMessagesPage(db, guildId, skip, limit) {
        const database = db.collection("deleted_messages");
        return await database.find({
            guildId
        }).skip(skip).limit(limit).toArray();
    }

    // mute
    async getAllMutedWords(db, guildId) {
        const database = db.collection("mute");
        return (await database.find({ guildId }).toArray()).map(doc => doc.word);
    }

    async deleteMutedWord(db, guildId, word) {
        const database = db.collection("mute");
        return await database.deleteOne({ guildId, word });
    }

    async clearMutedWords(db, guildId) {
        const database = db.collection("mute");
        return await database.deleteMany({ guildId });
    }

    async addMutedWord(db, guildId, word) {
        const database = db.collection("mute");
        return await database.insertOne({ guildId, word });
    }

    // timeout

    // TODO: add later. Currently a bit tricky
};