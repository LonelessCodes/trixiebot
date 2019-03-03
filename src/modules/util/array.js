const secureRandom = require("../secureRandom");

module.exports = new class ArrayUtils {
    async randomItem(arr) {
        return await secureRandom(arr);
    }

    lastItem(arr) {
        return arr[arr.length - 1];
    }
};