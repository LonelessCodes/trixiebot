const Datastore = require("./Datastore");

if (!global._database) global._database = {};

if (!global._database["poll"]) {
    global._database["poll"] = new Datastore({ filename: "./data/poll.nedb" });
}

/**
 * @type {Datastore}
 */
module.exports = global._database["poll"];
