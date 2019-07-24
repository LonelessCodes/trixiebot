/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const chalk = require("chalk");

/**
 * Fits the length of the input string to the specified length.
 * E.g. Useful to fit a 6bit string (each char either 1 or 0) to an 8bit string
 * @param {any} input
 * @param {number} length
 * @returns {string}
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
     * @returns {Logger}
     */
    namespace(ns, ...args) {
        const logger = new Logger([...this._ns, ns]);
        if (args.length > 0) logger(...args);
        return logger;
    }
}

module.exports = new Logger;
