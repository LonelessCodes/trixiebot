module.exports = function random(...args) {
    if (args.length === 0) {
        return Math.random();
    } else if (args.length === 1) {
        if (typeof args[0] === "number") {
            return args[0] <= 1 ? 0 : Math.random() * args[0];
        } else if (args[0] instanceof Array) {
            return args[0].length <= 1 ? args[0][0] : args[0][Math.random() * args[0].length];
        } else {
            throw new Error("First argument should be number or Array");
        }
    } else if (args.length === 2) {
        return args[0] === args[1] ||
            args[0] === args[1] - 1 ? 0 : (Math.random() * (args[1] - args[0])) + args[0];
    }
};
