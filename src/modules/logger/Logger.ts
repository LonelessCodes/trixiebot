/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

import chalk from "chalk";
import { pad } from "../../util/string";
import util from "util";

function getTimeString() {
    const d = new Date();

    const time =
        // eslint-disable-next-line prefer-template
        pad(d.getDate(), 2) +
        "." +
        pad(d.getMonth() + 1, 2) +
        ". " +
        pad(d.getHours(), 2) +
        ":" +
        pad(d.getMinutes(), 2) +
        ":" +
        pad(d.getSeconds(), 2) +
        "." +
        pad(d.getMilliseconds(), 3);

    return chalk.cyan.bold(time) + ">";
}

interface Logger {
    (format: any, ...param: any[]): void;
}

class Logger {
    private _ns: string[];

    constructor(ns: string[] = []) {
        this._ns = [...ns];

        const f = ((format: any, ...param: any[]): void => {
            this._writeOut(getTimeString(), ...this.ns, util.format(format, ...param));
        }) as Logger;
        Object.assign(f, this);
        Object.setPrototypeOf(f, Logger.prototype);
        return f;
    }

    private _writeOut(...msgs: string[]) {
        process.stdout.write(msgs.join(" ") + "\n");
    }
    private _writeErr(...msgs: string[]) {
        process.stderr.write(msgs.join(" ") + "\n");
    }

    get ns() {
        return this._ns.map(ns => chalk.magenta(`[${ns}]`));
    }

    warn(format: any, ...param: any[]) {
        this._writeErr(getTimeString(), chalk.yellow("warn"), ...this.ns, util.format(format, ...param));
    }

    error(format: any, ...param: any[]) {
        this._writeErr(getTimeString(), chalk.bgRed.white.bold("error"), ...this.ns, util.format(format, ...param));
    }

    debug(context: string, format: any, ...param: any[]) {
        this._writeOut(getTimeString(), ...this.ns, chalk.cyan.bold(context + ":"), util.format(format, ...param));
    }

    namespace(ns: string, ...param: any[]): Logger {
        const logger = new Logger([...this._ns, ns]);
        if (param.length > 0) logger(param[0], ...param.slice(1));
        return logger;
    }
}

export default Logger;
