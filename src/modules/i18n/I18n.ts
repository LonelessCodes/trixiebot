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

/*
 * Made this little module because I just couldn't find any i18n packages that
 * suited my needs for TrixieBot
 */

const log = require("../../log").default.namespace("i18n");

import { debounce } from "../../util/util";
import { KeyValue } from "../../util/types";
import fs from "fs-extra";
import path from "path";
import * as Plurals from "make-plural/plurals";
import parseInterval from "math-interval-parser";
import { EventEmitter } from "events";

// support for OwO language
Object.defineProperty(Plurals, "owo", { value: Plurals["en"] });

interface Plurals {
    [x: string]: ((num: number) => string) | undefined;
}

const PLURALS_FOR_LOCALE: { [code: string]: Intl.PluralRules | undefined } = {};

// eslint-disable-next-line valid-jsdoc
/**
 * test a number to match mathematical interval expressions
 * [0,2] - 0 to 2 (including, matches: 0, 1, 2)
 * ]0,3[ - 0 to 3 (excluding, matches: 1, 2)
 * [1]   - 1 (matches: 1)
 * [20,] - all numbers ≥20 (matches: 20, 21, 22, ...)
 * [,20] - all numbers ≤20 (matches: 20, 21, 22, ...)
 */
function matchInterval(number: number, interval_str: string): boolean {
    const interval = parseInterval(interval_str);
    if (!interval || typeof number !== "number") return false;

    if (interval.from.value === number) {
        return interval.from.included;
    }
    if (interval.to.value === number) {
        return interval.to.included;
    }

    return (
        Math.min(interval.from.value, number) === interval.from.value && Math.max(interval.to.value, number) === interval.to.value
    );
}

// eslint-disable-next-line valid-jsdoc
/**
 * splits and parses a phrase for mathematical interval expressions
 */
function parsePluralInterval(phrase: string, count: number): string {
    const phrases = phrase.split(/(?<!\\)\|/);

    // some() breaks on 1st true
    phrases.some(p => {
        const matches = p.match(/^\s*([()[\]\d,]+)?\s*(.*)$/);

        // not the same as in combined condition
        if (matches && matches[1]) {
            if (matchInterval(count, matches[1])) {
                phrase = matches[2];
                return true;
            }
        } else {
            phrase = p;
        }

        return false;
    });
    // unmask the pipe again
    return phrase.replace("\\|", "|");
}

function postProcess(msg: string, count: number = 1): string {
    // test for parsable interval string
    // (?<!\\) negative lookbehind to allow escaping the pipe
    if (/(?<!\\)\|/.test(msg)) {
        msg = parsePluralInterval(msg, count);
    }

    return msg;
}

export interface LocaleEntries {
    [x: string]: LocaleEntry | undefined;
}
export type LocaleEntry = LocaleEntries | string;
export interface PluralEntry {
    [x: string]: string;
    one: string;
    other: string;
}

export type PluralResolvable = [string, string] | { singular: string; plural?: string } | PluralEntry;

export class I18nLocale {
    manager: I18n;
    locale: string;

    constructor(manager: I18n, locale: string) {
        this.manager = manager;
        this.locale = locale;
    }

    translate(id: string): string;
    translate(id: string, phrase: string): string;
    translate(id: string, phrase?: string): string {
        if (typeof phrase !== "undefined") return this.manager.translate(this.locale, id, phrase);
        return this.manager.translate(this.locale, id);
    }

    translateN(id: string, count: number): string;
    translateN(id: string, phrase: PluralResolvable, count: number): string;
    translateN(id: string, phrase: number | PluralResolvable, count?: number): string {
        if (typeof count !== "undefined" && typeof phrase !== "number") {
            if (Array.isArray(phrase))
                this.manager.translateN(this.locale, id, { one: phrase[0], other: phrase[1] || phrase[0] }, count);
            if ("singular" in phrase && typeof phrase.singular !== "undefined")
                return this.manager.translateN(
                    this.locale,
                    id,
                    { one: phrase.singular, other: phrase.plural || phrase.singular },
                    count
                );
            if ("one" in phrase) return this.manager.translateN(this.locale, id, phrase, count);
            return this.manager.translateN(this.locale, id, count);
        } else if (typeof phrase === "number") {
            return this.manager.translateN(this.locale, id, phrase);
        }
        throw new TypeError("Passed arguments match none of the overloads");
    }
}

export interface I18nOptions {
    locales?: string[] | KeyValue<LocaleEntries>;
    fallbacks?: KeyValue<string>;
    default_locale: string;
    auto_reload?: boolean;
    directory: string;
    extension?: string;
    object_notation?: string;
    prefix?: string;
    indent?: number;
    update_files?: boolean;
}

export default class I18n extends EventEmitter {
    public locales: KeyValue<LocaleEntries>;
    public fallbacks: KeyValue<string>;
    public default_locale: string;
    public auto_reload: boolean;
    public directory: string;
    public extension: string;
    public object_notation: string;
    public prefix: string;
    public indent: number;
    public update_files: boolean;

    constructor(opts: I18nOptions) {
        super();

        if (!opts.default_locale) throw new TypeError("Default locale was not specified!");
        if (!opts.directory) throw new TypeError("Locale directory path was not specified!");

        this.fallbacks = opts.fallbacks || {};
        this.default_locale = opts.default_locale;
        this.auto_reload = opts.auto_reload || false;
        this.directory = opts.directory;
        this.extension = opts.extension || ".json";
        this.object_notation = opts.object_notation || ".";
        this.prefix = opts.prefix || "";
        this.indent = typeof opts.indent === "undefined" ? 2 : opts.indent;
        this.update_files = opts.update_files || false;

        // when missing locales we try to guess that from directory
        const locales = opts.locales || this.guessLocales(this.directory);

        // implicitly read all locales
        if (Array.isArray(locales)) {
            this.locales = {};
            locales.forEach(l => this.read(l));

            // auto reload locale files when changed
            if (this.auto_reload) {
                const updatable: Set<string> = new Set();

                const updater = debounce(() => {
                    for (const filename of updatable.values()) {
                        const locale_from_file = this.guessLocaleFromFile(filename);

                        if (locale_from_file && locales.indexOf(locale_from_file) > -1) {
                            log('Auto reloading locale file "' + filename + '"');
                            this.read(locale_from_file);
                        }
                    }
                    updatable.clear();
                }, 500);

                // watch changes of locale files
                // debounce the watch handler, because of some bugs it fires multiple times
                // especially when files are slowly downloaded to disk
                fs.watch(this.directory, (event, filename) => {
                    updatable.add(filename);
                    updater();
                });
            }
        } else {
            this.locales = locales;
        }

        if (!(this.default_locale in this.locales)) throw new Error("Default locale is not part of locales!");
    }

    private _localeAccessor(locale: string, id: string) {
        // Bail out on non-existent locales beforehand to improve performance
        if (!this.locales[locale]) return;

        // Handle object lookup notation
        const index_of_dot = id.lastIndexOf(this.object_notation);
        if (index_of_dot > 0 && index_of_dot < id.length - 1) {
            // Split the provided term and run the callback for each subterm.
            return id.split(this.object_notation).reduce((object: LocaleEntry | undefined, index: string) => {
                if (typeof object === "undefined") return undefined;
                if (typeof object === "string") return object;
                if (!(index in object)) return undefined;
                return object[index];
            }, this.locales[locale]);
        }
        // No object notation, just return an accessor that performs array lookup.
        return this.locales[locale]![id];
    }

    private _localeMutator(locale: string, id: string, value: LocaleEntry, allow_branching = true): void {
        // Bail out on non-existent locales beforehand to improve performance
        if (!this.locales[locale]) return;

        // Handle object lookup notation
        const index_of_dot = id.lastIndexOf(this.object_notation);
        if (index_of_dot > 0 && index_of_dot < id.length - 1) {
            // Split the provided term and run the callback for each subterm.
            const split = id.split(this.object_notation);
            const path = split.slice(0, -1);
            const index = split[split.length - 1];

            const obj = path.reduce((object: LocaleEntry | undefined, index: string) => {
                if (typeof object === "undefined") return undefined;
                if (typeof object === "string") return undefined;

                // If our current target object (in the locale tree) doesn't exist or
                // it doesn't have the next subterm as a member...
                if (!(index in object)) {
                    // ...check if we're allowed to create new branches.
                    if (allow_branching) {
                        object[index] = {};
                    } else {
                        return undefined;
                    }
                }

                // Return a reference to the next deeper level in the locale tree.
                return object[index];
            }, this.locales[locale]);

            if (typeof obj === "undefined") return;
            if (typeof obj === "string") return;

            obj[index] = value;
        } else {
            // No object notation, just return an accessor that performs array lookup.
            this.locales[locale]![id] = value;
        }
    }

    private _translate(locale: string, id: string, default_msg?: LocaleEntry): LocaleEntry {
        if (!this.locales[locale] && this.fallbacks[locale]) {
            locale = this.fallbacks[locale]!;
        }

        // attempt to read when defined as valid locale
        if (!this.locales[locale] && !this.auto_reload) {
            this.read(locale);
        }

        // fallback to default when missed
        if (!this.locales[locale]) {
            locale = this.default_locale;
            if (!this.locales[locale] && !this.auto_reload) this.read(locale);
        }

        let msg = this._localeAccessor(locale, id);
        if (!msg && default_msg && this.update_files) {
            this._localeMutator(this.default_locale, id, default_msg);
            this.write(locale);
        }

        if (!msg || msg === "") msg = default_msg || id;

        return msg;
    }

    translate(locale: string, id: string): string;
    translate(locale: string, id: string, phrase: string): string;
    translate(locale: string, id: string, phrase?: string): string {
        let msg = this._translate(locale, id, phrase);

        if (typeof msg === "object") {
            if (typeof msg.one === "string") {
                // postprocess to get compatible to plurals
                msg = msg.one;
            } else if (typeof msg.other === "string") {
                // in case there is no 'one' but an 'other' rule
                msg = msg.other;
            } else if (phrase) {
                // if it's an object with neither 'one' or 'other'
                msg = phrase;
                if (this.update_files) {
                    this._localeMutator(this.default_locale, id, phrase);
                    this.write(locale);
                }
            } else {
                msg = id;
            }

            // head over to postProcessing
            return postProcess(msg);
        }

        // head over to postProcessing
        return postProcess(msg);
    }

    translateN(locale: string, id: string, count: number): string;
    translateN(locale: string, id: string, phrase: PluralEntry, count: number): string;
    translateN(locale: string, id: string, phrase: number | PluralEntry | undefined, count?: number): string {
        if (typeof phrase === "number") {
            count = phrase;
            phrase = undefined;
        }
        if (typeof count === "undefined") count = 1;

        const msg = this._translate(locale, id, phrase);

        // find the correct plural rule for given locale
        if (typeof msg === "object") {
            // use Intl to check native plural rules and format the lang
            const supported = Intl.PluralRules.supportedLocalesOf([locale]);
            locale = supported.length > 0 ? supported[0] : locale;

            let rtn: LocaleEntry | undefined;
            try {
                if (!PLURALS_FOR_LOCALE[locale]) PLURALS_FOR_LOCALE[locale] = new Intl.PluralRules(locale, { type: "cardinal" });
                if (!PLURALS_FOR_LOCALE[locale]) throw new Error("Move on to catch statement");
                rtn = msg[PLURALS_FOR_LOCALE[locale]!.select(count)];
            } catch (_) {
                // split locales with a region code
                const lc = locale
                    .toLowerCase()
                    .split(/[_-\s]+/)
                    .filter(el => true && el);
                // take the first part of locale, fallback to full locale
                locale = lc[0] || locale;

                if (typeof (Plurals as Plurals)[locale] === "function") rtn = msg[(Plurals as Plurals)[locale]!(count)];
            }

            // fallback to 'other' on case of missing translations
            if (!rtn) rtn = msg.other;
            if (typeof rtn !== "string") rtn = phrase?.one || phrase?.other || id;

            // head over to postProcessing
            return postProcess(rtn, count);
        }
        // head over to postProcessing
        return postProcess(msg, count);
    }

    translateHashed(id: string): { [x: string]: string };
    translateHashed(id: string, phrase: string): { [x: string]: string };
    translateHashed(id: string, phrase?: string) {
        const translations: { [x: string]: string } = {};
        Object.keys(this.locales)
            .sort()
            .forEach(locale => {
                translations[locale] = phrase ? this.translate(locale, id, phrase) : this.translate(locale, id);
            });
        return translations;
    }

    translateNHashed(id: string, count: number): { [x: string]: string };
    translateNHashed(id: string, phrase: PluralEntry, count: number): { [x: string]: string };
    translateNHashed(id: string, phrase: PluralEntry | number, count?: number) {
        const translations: { [x: string]: string } = {};
        if (typeof phrase === "number") {
            for (const locale of this.getLocales()) translations[locale] = this.translateN(locale, id, phrase);
        } else if (typeof count === "number") {
            for (const locale of this.getLocales()) translations[locale] = this.translateN(locale, id, phrase, count);
        }
        return translations;
    }

    getTranslator(locale: string = this.default_locale) {
        return new I18nLocale(this, locale);
    }

    // Locale Catalog

    getLocales() {
        return Object.keys(this.locales).filter(locale => locale in Plurals);
    }

    hasLocale(locale: string) {
        return locale in this.locales && locale in Plurals;
    }

    addLocale(locale: string) {
        this.read(locale);
    }

    removeLocale(locale: string) {
        delete this.locales[locale];
    }

    // File system

    // eslint-disable-next-line valid-jsdoc
    /**
     * Read a locale file into memory
     */
    read(locale: string) {
        const file = this.getStorageFilePath(locale);
        try {
            log("read " + file + " for locale: " + locale);
            const locale_file = fs.readFileSync(file, { encoding: "utf8" });
            try {
                // parsing filecontents to locales[locale]
                this.locales[locale] = JSON.parse(locale_file);

                this.emit("read", { locale, file });
            } catch (parseError) {
                log.error("Unable to parse locales from file (maybe " + file + " is empty or invalid json?):", parseError);
            }
        } catch (readError) {
            // unable to read, so intialize that file
            // locales[locale] are already set in memory, so no extra read required
            // or locales[locale] are empty, which initializes an empty locale.json file

            // since the current invalid locale could exist, we should back it up
            if (!fs.existsSync(file)) return;
            log("backing up invalid locale " + locale + " to " + file + ".invalid");
            fs.renameSync(file, file + ".invalid");
        }
    }

    /**
     * Write the locale memory into a file
     */
    write(locale: string) {
        if (!this.locales[locale]) return;

        const target = this.getStorageFilePath(locale);
        const tmp = target + ".tmp";

        // writing to tmp and rename on success
        try {
            log("write " + target + " for locale: " + locale);
            fs.writeFileSync(tmp, JSON.stringify(this.locales[locale], null, this.indent), "utf8");
            const stats = fs.statSync(tmp);
            if (stats.isFile()) {
                fs.renameSync(tmp, target);
            } else {
                log.error("unable to write locales to file (either " + tmp + " or " + target + " are not writeable?): ");
            }
        } catch (e) {
            log.error("unexpected error writing files (either " + tmp + " or " + target + " are not writeable?): ", e);
        }
    }

    guessLocales(directory: string) {
        const entries = fs.readdirSync(directory);
        const locales_found = [];

        for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].match(/^\./)) continue;
            const locale_from_file = this.guessLocaleFromFile(entries[i]);
            if (locale_from_file) locales_found.push(locale_from_file);
        }

        return locales_found.sort();
    }

    guessLocaleFromFile(filename: string) {
        const prefix_regex = new RegExp("^" + this.prefix, "g");
        const extension_regex = new RegExp(this.extension + "$", "g");

        if (this.prefix !== "" && !filename.match(prefix_regex)) return null;
        if (this.extension !== "" && !filename.match(extension_regex)) return null;
        return filename.replace(prefix_regex, "").replace(extension_regex, "");
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * basic normalization of filepath
     */
    getStorageFilePath(locale: string): string {
        return path.normalize(path.join(this.directory, this.prefix + locale + this.extension));
    }
}
