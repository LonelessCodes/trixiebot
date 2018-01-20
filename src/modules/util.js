/**
 * @param {number} ms 
 * @returns {Promise<void>}
 */
module.exports.timeout = function (ms) {
    return new Promise(res => setTimeout(res, ms));
};

const names = ["d", "h", "m", "s"];

function pad(num, size) {
    const s = "00" + num;
    return s.substr(s.length - size);
}

/**
 * @param {number} ms 
 * @returns {string}
 */
module.exports.toHumanTime = function toHumanTime(ms) {
    const d = new Date(ms);
    const arr = [
        d.getDate() - 1,
        d.getHours(),
        d.getMinutes(),
        d.getSeconds()
    ];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i]) // 0 is short for false, so if not 0, go on
            arr[i] = pad(arr[i], 2) + names[i];
    }
    return arr.filter(str => !!str).join(" ");
};

const multiplier = {
    "d": 1000 * 3600 * 24,
    "h": 1000 * 3600,
    "m": 1000 * 60,
    "s": 1000,
    "ms": 1
};

/**
 * @param {string} string
 * @returns {number}
 */
module.exports.parseHumanTime = function parseHumanTime(string) {
    let ms = 0;
    let number = "0";

    const matches = string.match(/[0-9.]+|\w+/g);
    for (let match of matches) {
        if (/[0-9.]+/.test(match)) {
            number += match;
        } else if (/\w+/.test(match)) {
            const num = Number.parseFloat(number);
            number = "0";
            if (multiplier[match]) ms += num * multiplier[match];
        }
    }

    return ms;
};
