const Datastore = require("./Datastore");

if (!global._database) global._database = {};

if (!global._database["timeout"]) {
    const db = new Datastore({ filename: "./data/timeout.nedb" });
    db.ensureIndex({ fieldName: "expiresAt", expireAfterSeconds: 0 });
    global._database["timeout"] = db;
}

/**
 * @type {Datastore}
 */
module.exports = global._database["timeout"];
