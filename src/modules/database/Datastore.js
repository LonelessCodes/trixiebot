const diskDB = require("diskdb");
    
if (!global._diskdb) {
    diskDB.connect("./data");
    diskDB.Collection = class Collection {
        constructor(name) {
            this._ensureIndex = {};
            this.table = diskDB.loadCollections([name])[name];
            console.log(this.table.find());
            for (let method in this.table) {
                if (typeof this.table[method] === "function") {
                    this.table[method] = this.table[method].bind(this.table);
                }
            }
            const oldFind = this.table.find;
            this.table.find = query => {
                return this.filterRows(this.table, oldFind(query));
            };
            const oldFindOne = this.table.findOne;
            this.table.findOne = query => {
                const result = oldFindOne(query);
                if (!result) return result;
                return this.filterRows(this.table, [result])[0];
            };
            this.table.filterRows = this.filterRows.bind(this);
            this.table.ensureIndex = this.ensureIndex.bind(this);
            return this.table;
        }

        filterRows(table, rows) {
            let field;
            for (let index in this._ensureIndex) {
                rows = rows.filter(row => {
                    field = row[index];
                    if (typeof this._ensureIndex[index].expireAfterSeconds === "number" &&
                        field + this._ensureIndex[index].expireAfterSeconds <= Date.now()) {
                        table.remove({ _id: row._id });
                        return false;
                    }
                    return true;
                });
            }
            return rows;
        } 

        ensureIndex(opts) {
            this._ensureIndex[opts.fieldName] = opts;
            return this.table;
        }
    };
    global._diskdb = diskDB;    
}

/**
 * @type {diskDB}
 */
module.exports = global._diskdb;
