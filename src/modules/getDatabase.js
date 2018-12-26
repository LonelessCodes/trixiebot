const { MongoClient } = require("mongodb");
const info = require("../info");

const database = MongoClient
    .connect("mongodb://localhost:27017/", {
        autoReconnect: true,
        useNewUrlParser: true
    });

const defaultDB = info.DEV ? "trixiedev" : "trixiebot";

module.exports = function getDatabase(name = defaultDB) {
    return database.then(client => client.db(name));
};