const Datastore = require("./Datastore");

if (!global._database) global._database = {};

if (!global._database["timeout_messages"]) {
    const db = new Datastore({ filename: "./data/timeout_messages.nedb", autoload: true });
    db.ensureIndex({ fieldName: "timeoutEnd", expireAfterSeconds: 24 * 3600 * 1000 });
    global._database["timeout_messages"] = db;
}

/**
 * @type {Datastore}
 */
module.exports = global._database["timeout_messages"];
