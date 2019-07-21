class TimeUnit {
    constructor(millis, singular, plural) {
        this._millis = millis;
        this.singular = singular;
        this.plural = plural;
    }

    toMillis(number) {
        return this._millis * number;
    }

    toNum(millis) {
        return millis / this._millis;
    }

    toString(number) {
        if (number) {
            return number === 1 ? `${number} ${this.singular}` : `${number} ${this.plural}`;
        } else {
            return this.singular;
        }
    }
}

TimeUnit.MILLISECOND = new TimeUnit(1, "millisecond", "milliseconds");
TimeUnit.SECOND = new TimeUnit(1000, "second", "seconds");
TimeUnit.MINUTE = new TimeUnit(60000, "minute", "minutes");
TimeUnit.HOUR = new TimeUnit(3600000, "hour", "hours");
TimeUnit.DAY = new TimeUnit(3600000 * 24, "day", "days");
TimeUnit.WEEK = new TimeUnit(3600000 * 24 * 7, "week", "weeks");

module.exports = TimeUnit;
