const NS_PER_SEC = 1e9;

class NanoTimer {
    constructor() {
        this._begin = null;
        this._diff = null;
    }
    begin() {
        this._begin = process.hrtime();
        return this;
    }
    end() {
        this._diff = process.hrtime(this._begin);
        return this._diff[0] * NS_PER_SEC + this._diff[1];
    }
}
NanoTimer.NS_PER_SEC = NS_PER_SEC;

module.exports = NanoTimer;