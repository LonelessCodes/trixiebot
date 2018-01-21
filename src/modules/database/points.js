const Datastore = require("./Datastore");

if (!global._database) global._database = {};

if (!global._database["points"]) {
    global._database["points"] = new Datastore({ filename: "./data/points.nedb", autoload: true });
}

/**
 * @type {Datastore}
 */
module.exports = global._database["points"];
