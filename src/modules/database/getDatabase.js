const { MongoClient } = require("mongodb");

module.exports = {
    async getDatabase() {
        if (this.db) return this.db;

        const client = await MongoClient.connect("mongodb://localhost:27017/", { autoReconnect: true });
        this.db = client.db("trixiebot");
        return this.db;
    }
};