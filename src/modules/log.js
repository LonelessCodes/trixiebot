const chalk = require("chalk");

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

function getTimeString() {
    const d = new Date();

    const time =
        toString(d.getDate(), 2) + "." +
        toString(d.getMonth() + 1, 2) + ". " +
        toString(d.getHours(), 2) + ":" +
        toString(d.getMinutes(), 2) + ":" +
        toString(d.getSeconds(), 2) + "." +
        toString(d.getMilliseconds(), 3);

    return chalk.cyan.bold(time) + ">";
}


/**
 * Logger
 */

class Logger extends Function {
    /**
     * @returns {function(...messages: any[]): void}
     */
    constructor() {
        /**
         * @param {any[]} messages
         */
        function log(...messages) { 
            console.log(getTimeString(), ...messages);
        }
        Object.setPrototypeOf(log, Logger.prototype);
        return log;
    }

    warn(...messages) {
        console.warn(getTimeString(), chalk.yellow("warn"), ...messages);
    }

    error(...messages) {
        console.error(getTimeString(), chalk.bgRed.white.bold("error"), ...messages);
    }

    debug(file, ...messages) {
        console.debug(getTimeString(), chalk.cyan.bold(file), ...messages);
    }
}

module.exports = new Logger;
