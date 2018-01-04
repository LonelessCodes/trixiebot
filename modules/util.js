module.exports.timeout = function (ms) {
    return new Promise(res => setTimeout(res, ms));
};
