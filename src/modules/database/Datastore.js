const NeDB = require("nedb");
const { promisify } = require("util");

class Datastore extends NeDB {}

Datastore.prototype.count = promisify(Datastore.prototype.count);
Datastore.prototype.ensureIndex = promisify(Datastore.prototype.ensureIndex);
Datastore.prototype.find = promisify(Datastore.prototype.find);
Datastore.prototype.findOne = promisify(Datastore.prototype.findOne);
Datastore.prototype.has = async function (query) {
    const row = await this.findOne(query);
    return !!row;
};
Datastore.prototype.insert = promisify(Datastore.prototype.insert);
Datastore.prototype.loadDatabase = promisify(Datastore.prototype.loadDatabase);
Datastore.prototype.remove = promisify(Datastore.prototype.remove);
Datastore.prototype.removeIndex = promisify(Datastore.prototype.removeIndex);
Datastore.prototype.set = async function (query, update, options = {}) {
    options.upsert = true;
    return await this.update(query, update, options);
};
Datastore.prototype.update = promisify(Datastore.prototype.update);

module.exports = Datastore;
