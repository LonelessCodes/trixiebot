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

import { Primitive } from "type-fest";

const PATTERNS = Object.freeze({
    SPLIT: /\s+/,
});

export function normalizeArray(raw: string[], expected_size: number): string[] {
    const normalized: string[] = new Array(expected_size).fill("");

    for (let i = 0; i < normalized.length; i++) {
        if (i < raw.length && raw[i]) normalized[i] = raw[i];
    }
    return normalized;
}

export function splitArgs(args: string, expected_args: number = 0): string[] {
    if (expected_args < 1) return [args];

    const raw: string[] = [];

    let i = 0;
    while (i < expected_args - 1) {
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
    return normalizeArray(raw, expected_args);
}

export function findArgs(str: string): string[] {
    const array: string[] = [];
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

export function resolveStdout(string: string): string {
    return string.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
}

export function escapeRegExp(string: string): string {
    return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export function ucFirst(string: string): string {
    return string
        .split(" ")
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
}

export function format(message: string, format: { [key: string]: Primitive } = {}): string {
    for (const f in format) {
        message = message.replace(new RegExp(`{{\\s*${escapeRegExp(f)}\\s*}}`, "g"), String(format[f]));
    }
    return message;
}

export function pad(value: any, width: number, fill: string = "0"): string {
    value = String(value);

    // String#repeat is kinda fancy, you gotta admit
    return value.length >= width ? value : fill.repeat(Math.max(0, width - value.length)) + value;
}
