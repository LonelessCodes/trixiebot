const db = require("./Datastore");

module.exports = new db.Collection("timeoutmessages").ensureIndex({ fieldName: "timeoutEnd", expireAfterSeconds: 24 * 3600 * 1000 });
