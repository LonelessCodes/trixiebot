const colors = require("colors");

/**
 * Fits the length of the input string to the specified length.
 * E.g. Useful to fit a 6bit string (each char either 1 or 0) to an 8bit string
 */
function toString(input, length) {
    input = input.toString ? input.toString() : input;
    let string = "";
    for (let i = 0; i < length - input.length; i++) string += "0";
    string += input;
    return string;
}

function getTimeString(blank) {
    const d = new Date();

    const time =
        toString(d.getMonth() + 1, 2) + "." +
        toString(d.getDate(), 2) + " " +
        toString(d.getHours(), 2) + ":" +
        toString(d.getMinutes(), 2) + ":" +
        toString(d.getSeconds(), 2) + ":" +
        toString(d.getMilliseconds(), 3);

    if (blank) return time + "> ";
    else return colors.cyan.bold(time) + "> ";
}

function log(...messages) {
    console.log(getTimeString(), ...messages);
}

module.exports = log;