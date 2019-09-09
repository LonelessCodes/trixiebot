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

const PATTERNS = Object.freeze({
    SPLIT: /\s+/,
});

module.exports = new class StringUtils {
    /**
     * @param {string} raw Original array
     * @param {number} expectedSize Size of the new array
     * @returns {string}
     */
    normalizeArray(raw, expectedSize) {
        /**
         * @type {string[]}
         */
        const normalized = new Array(expectedSize).fill("");

        for (let i = 0; i < normalized.length; i++) {
            if (i < raw.length && raw[i]) normalized[i] = raw[i];
        }
        return normalized;
    }

    splitArgs(args, expectedArgs = 0) {
        if (expectedArgs < 1) return [args];

        const raw = [];

        let i = 0;
        while (i < expectedArgs - 1) {
            const match = PATTERNS.SPLIT.exec(args);
            if (!match) {
                break;
            } else {
                raw.push(args.substr(0, match.index));
                args = args.substr(match.index + match[0].length);
            }
            i++;
        }
        raw.push(args);
        return module.exports.normalizeArray(raw, expectedArgs);
    }

    findArgs(str) {
        const array = [];
        let tmp = "";
        let inquote = false;
        let quote = "";
        let i = 0;
        let char = "";
        while (i < str.length) {
            char = str.charAt(i);
            i++;

            if (char === "\"" || char === "'") {
                if (!inquote) {
                    quote = char;
                    inquote = true;
                } else if (quote !== char) {
                    tmp += char;
                    continue;
                } else if (quote === char) {
                    inquote = false;
                }
            } else if (char === " ") {
                if (inquote) {
                    tmp += char;
                    continue;
                }
            } else {
                tmp += char;
                continue;
            }

            if (tmp !== "") {
                array.push(tmp);
                tmp = "";
            }
        }

        if (tmp !== "") {
            array.push(tmp);
            tmp = "";
        }

        return array;
    }

    /**
     * @param {string} string String to escape
     * @returns {string}
     */
    resolveStdout(string) {
        return string.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
    }

    /**
     * @param {string} string
     * @returns {string}
     */
    escapeRegExp(string) {
        return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    /**
     * Make first letter of each word uppercase
     * @param {string} string
     * @returns {string}
     */
    ucFirst(string) {
        return string.split(" ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
    }

    format(message, format = {}) {
        for (const f in format) {
            message = message.replace(new RegExp(`{{\\s*${module.exports.escapeRegExp(f)}\\s*}}`, "g"), format[f]);
        }
        return message;
    }
};
