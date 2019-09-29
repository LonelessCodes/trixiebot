/**
 * Auto increment support for mongodb and mongoose
 * Created by Alexey Chistyakov <ross@newmail.ru> on 11.10.2014.
 */

const settings = {
    collection: "inc_counters",
};

/**
 * Get next sequence id for the given collection in the given database
 *
 * @param {MongodbNativeDriver} db Connection to mongodb native driver
 * @param {string} collectionName Current collection name to get auto increment field for
 * @returns {Promise<number>}
 */
function getNextSequence(db, collectionName) {
    return new Promise((res, rej) => {
        if (db._state == "connecting") {
            db.once("open", (_, db) => getNextId(db, collectionName, (err, num) => {
                if (err) return rej(err);
                else return res(num);
            }));
        } else {
            getNextId(db, collectionName, (err, num) => {
                if (err) return rej(err);
                else return res(num);
            });
        }
    });
}
module.exports = getNextSequence;

/**
 * Get next auto increment index for the given collection
 * @param {MongodbNativeDriver} db
 * @param {string} collectionName
 * @param {Function} callback
 */
function getNextId(db, collectionName, callback) {
    const collection = db.collection(settings.collection);

    collection.findOneAndUpdate(
        { _id: collectionName },
        { $inc: { seq: 1 } },
        { upsert: true },
        (err, result) => {
            if (err) {
                if (err.code == 11000) {
                    process.nextTick(getNextId.bind(null, db, collectionName, callback));
                } else {
                    callback(err);
                }
            } else if (result.value && typeof result.value.seq === "number") {
                callback(null, result.value.seq);
            } else {
                callback(null, result.seq || 0);
            }
        }
    );
}
