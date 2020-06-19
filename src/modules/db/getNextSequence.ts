/**
 * Auto increment support for mongodb and mongoose
 * Created by Alexey Chistyakov <ross@newmail.ru> on 11.10.2014.
 */

import { tick } from "../../util/promises";
import { Db } from "mongodb";

/**
 * Get next sequence id for the given collection in the given database
 *
 * @param {Db} db Connection to mongodb native driver
 * @param {any} context Current context to get auto increment field for
 * @returns {Promise<number>}
 */
async function getNextSequence(db: Db, context: any): Promise<number> {
    const collection = db.collection("inc_counters");

    try {
        const result = await collection.findOneAndUpdate({ _id: context }, { $inc: { seq: 1 } }, { upsert: true });

        if (result.value && typeof result.value.seq === "number") {
            return result.value.seq;
        }
        return (result as any).seq as number;
    } catch (err) {
        if (err.code == 11000) {
            return await tick().then(() => getNextSequence(db, context));
        }
        throw err;
    }
}
export default getNextSequence;
