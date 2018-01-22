const db = require("./Datastore");

module.exports = new db.Collection("timeout").ensureIndex({ fieldName: "expiresAt", expireAfterSeconds: 0 });
