/**
 * Auto increment support for mongodb and mongoose
 * Created by Alexey Chistyakov <ross@newmail.ru> on 11.10.2014.
 */

const { tick } = require("../../util/promises");

/**
 * Get next sequence id for the given collection in the given database
 *
 * @param {MongodbNativeDriver} db Connection to mongodb native driver
 * @param {any} context Current context to get auto increment field for
 * @returns {Promise<number>}
 */
async function getNextSequence(db, context) {
    const collection = db.collection("inc_counters");

    try {
        const result = await collection.findOneAndUpdate(
            { _id: context },
            { $inc: { seq: 1 } },
            { upsert: true }
        );

        if (result.value && typeof result.value.seq === "number") {
            return result.value.seq;
        } else {
            return result.seq;
        }
    } catch (err) {
        if (err.code == 11000) {
            return await tick().then(() => getNextSequence(db, context));
        } else {
            throw err;
        }
    }
}
module.exports = getNextSequence;
