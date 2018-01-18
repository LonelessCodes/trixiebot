const sql = require("sqlite3");
const { promisify } = require("util");

sql.Database.prototype.get = promisify(sql.Database.prototype.get);
sql.Database.prototype.all = promisify(sql.Database.prototype.all);
sql.Database.prototype.run = promisify(sql.Database.prototype.run);

module.exports = sql;
