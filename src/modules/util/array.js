const secureRandom = require("../secureRandom");

module.exports = new class StringUtils {
    async randomItem() {
        return await secureRandom(this);
    }

    lastItem() {
        return this[this.length - 1];
    }
};