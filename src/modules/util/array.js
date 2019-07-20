const secureRandom = require("../secureRandom");

module.exports = class ArrayUtils {
    static async randomItem(arr) {
        return await secureRandom(arr);
    }

    static lastItem(arr) {
        return arr[arr.length - 1];
    }
};