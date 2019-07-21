const chalk = require("chalk");

/**
 * Fits the length of the input string to the specified length.
 * E.g. Useful to fit a 6bit string (each char either 1 or 0) to an 8bit string
 */
function toString(input, length) {
    input = typeof input.toString === "function" ? input.toString() : input;
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
     * @param {string[]} [ns]
     * @returns {function(...messages: any[]): void}
     */
    constructor(ns = []) {
        /**
         * @param {any[]} messages
         */
        function log(...messages) {
            console.log(getTimeString(), ...log.ns, ...messages);
        }
        Object.setPrototypeOf(log, Logger.prototype);
        log._ns = [...ns];
        return log;
    }

    get ns() {
        return this._ns.map(ns => chalk.magenta(`[${ns}]`));
    }

    /**
     * @param  {...any} messages 
     */
    warn(...messages) {
        console.warn(getTimeString(), chalk.yellow("warn"), ...this.ns, ...messages);
    }

    /**
     * @param  {...any} messages 
     */
    error(...messages) {
        console.error(getTimeString(), chalk.bgRed.white.bold("error"), ...this.ns, ...messages);
    }

    /**
     * @param {string} context 
     * @param  {...any} messages 
     */
    debug(context, ...messages) {
        console.debug(getTimeString(), ...this.ns, chalk.cyan.bold(context + ":"), ...messages);
    }

    /**
     * @param {string} ns 
     * @param  {...any} args 
     */
    namespace(ns, ...args) {
        const logger = new Logger([...this._ns, ns]);
        if (args.length > 0) logger(...args);
        return logger;
    }
}

module.exports = new Logger;
