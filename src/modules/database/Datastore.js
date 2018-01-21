const NeDB = require("nedb");
const { promisify } = require("util");

class Datastore extends NeDB {}

Datastore.prototype.count = promisify(NeDB.prototype.count);
Datastore.prototype.ensureIndex = promisify(NeDB.prototype.ensureIndex);
Datastore.prototype.find = promisify(NeDB.prototype.find);
Datastore.prototype.findOne = promisify(NeDB.prototype.findOne);
Datastore.prototype.has = async function (query) {
    console.log("test")
    this.findOne(query).then(row => {
        console.log("found", row);
    });
    const row = await this.findOne(query);
    console.log(row);
    return !!row;
};
Datastore.prototype.insert = promisify(NeDB.prototype.insert);
Datastore.prototype.loadDatabase = promisify(NeDB.prototype.loadDatabase);
Datastore.prototype.remove = promisify(NeDB.prototype.remove);
Datastore.prototype.removeIndex = promisify(NeDB.prototype.removeIndex);
Datastore.prototype.set = async function (query, update, options = {}) {
    options.upsert = true;
    return await this.update(query, update, options);
};
Datastore.prototype.update = promisify(NeDB.prototype.update);

module.exports = Datastore;
