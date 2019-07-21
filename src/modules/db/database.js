const { MongoClient } = require("mongodb");
const config = require("../../config");

if (!config.has("database.host") || !config.has("database.port"))
    throw new Error("No DB connection details (host, port) were specified in the configs");
if (!config.has("database.db"))
    throw new Error("No db name was specified in the configs");

const opts = {
    autoReconnect: true,
    useNewUrlParser: true,
};
if (config.has("database.auth")) opts.auth = config.get("database.auth");

const database = MongoClient
    .connect(`mongodb://${config.get("database.host")}:${config.get("database.port")}/`, opts);

module.exports = function db(name = config.get("database.db")) {
    return database.then(client => client.db(name));
};
module.exports.client = database;
