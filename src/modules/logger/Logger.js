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
const { pad } = require("../../util/string");
const util = require("util");

function getTimeString() {
    const d = new Date();

    const time =
        pad(d.getDate(), 2) + "." +
        pad(d.getMonth() + 1, 2) + ". " +
        pad(d.getHours(), 2) + ":" +
        pad(d.getMinutes(), 2) + ":" +
        pad(d.getSeconds(), 2) + "." +
        pad(d.getMilliseconds(), 3);

    return chalk.cyan.bold(time) + ">";
}

const format = (...args) => util.formatWithOptions({ colors: true }, ...args);

class Logger extends Function {
    /**
     * @param {string[]} [ns]
     * @returns {function(...messages: any[]): void}
     */
    constructor(ns = []) {
        /**
         * @param  {...any} messages
         */
        function log(...messages) {
            log._writeOut(getTimeString(), ...log.ns, format(...messages));
        }
        Object.setPrototypeOf(log, Logger.prototype);
        log._ns = [...ns];
        return log;
    }

    _writeOut(...msgs) {
        process.stdout.write(msgs.join(" ") + "\n");
    }

    _writeErr(...msgs) {
        process.stderr.write(msgs.join(" ") + "\n");
    }

    get ns() {
        return this._ns.map(ns => chalk.magenta(`[${ns}]`));
    }

    /**
     * @param  {...any} messages
     */
    warn(...messages) {
        this._writeErr(getTimeString(), chalk.yellow("warn"), ...this.ns, format(...messages));
    }

    /**
     * @param  {...any} messages
     */
    error(...messages) {
        this._writeErr(getTimeString(), chalk.bgRed.white.bold("error"), ...this.ns, format(...messages));
    }

    /**
     * @param {string} context
     * @param  {...any} messages
     */
    debug(context, ...messages) {
        this._writeOut(getTimeString(), ...this.ns, chalk.cyan.bold(context + ":"), format(...messages));
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

module.exports = Logger;
