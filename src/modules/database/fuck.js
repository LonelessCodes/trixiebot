const { getDatabase } = require("./getDatabase");

module.exports = {
    async initialize() {
        const db = await getDatabase();
        return db.collection("fuck");
    }
};
