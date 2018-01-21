const Datastore = require("./Datastore");

if (!global._database) global._database = {};

if (!global._database["fuck"]) {
    global._database["fuck"] = new Datastore({ filename: "./data/fuck.nedb", autoload: true });
}

/**
 * @type {Datastore}
 */
module.exports = global._database["fuck"];
