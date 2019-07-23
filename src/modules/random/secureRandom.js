const random = require("random-number-csprng");

module.exports = async function secureRandom(...args) {
    if (args.length === 0) {
        return (await random(0, 99)) / 100;
    } else if (args.length === 1) {
        if (typeof args[0] === "number") {
            return args[0] <= 1 ? 0 : await random(0, args[0] - 1);
        } else if (args[0] instanceof Array) {
            return args[0].length <= 1 ? args[0][0] : args[0][await random(0, args[0].length - 1)];
        } else {
            throw new Error("First argument should be number or Array");
        }
    } else if (args.length === 2) {
        return args[0] === args[1] ||
            args[0] === args[1] - 1 ? 0 : await random(args[0], args[1] - 1);
    }
};
