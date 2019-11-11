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

/*
 * Made this little module because I just couldn't find any i18n packages that
 * suited my needs for TrixieBot
 */

const { format } = require("../../util/string");
const { debounce } = require("../../util/util");
const log = require("../../log").namespace("i18n");
const fs = require("fs-extra");
const path = require("path");
const plurals = require("make-plural/umd/plurals");
const parseInterval = require("math-interval-parser").default;
const I18nLocale = require("./I18nLocale");
const events = require("events");

const PluralsForLocale = {};

function postProcess(msg, args, count = 1) {
    // test for parsable interval string
    // (?<!\\) negative lookbehind to allow escaping the pipe
    if ((/(?<!\\)\|/).test(msg)) {
        msg = parsePluralInterval(msg, count);
    }

    // if the msg string contains {{Mustache}} patterns we render it as a mini tempalate
    if ((/{{.*}}/).test(msg)) {
        msg = format(msg, args);
    }

    return msg;
}

/**
 * splits and parses a phrase for mathematical interval expressions
 * @param {string} phrase
 * @param {number} count
 * @returns {string}
 */
function parsePluralInterval(phrase, count) {
    let returnPhrase = phrase;
    const phrases = phrase.split(/(?<!\\)\|/);

    // some() breaks on 1st true
    phrases.some(p => {
        const matches = p.match(/^\s*([()[\]\d,]+)?\s*(.*)$/);

        // not the same as in combined condition
        if (matches[1]) {
            if (matchInterval(count, matches[1]) === true) {
                returnPhrase = matches[2];
                return true;
            }
        } else {
            returnPhrase = p;
        }

        return false;
    });
    return returnPhrase;
}

/**
 * test a number to match mathematical interval expressions
 * [0,2] - 0 to 2 (including, matches: 0, 1, 2)
 * ]0,3[ - 0 to 3 (excluding, matches: 1, 2)
 * [1]   - 1 (matches: 1)
 * [20,] - all numbers ≥20 (matches: 20, 21, 22, ...)
 * [,20] - all numbers ≤20 (matches: 20, 21, 22, ...)
 *
 * @param {number} number
 * @param {string} interval
 * @returns {boolean}
 */
function matchInterval(number, interval) {
    interval = parseInterval(interval);
    if (interval && typeof number === "number") {
        if (interval.from.value === number) {
            return interval.from.included;
        }
        if (interval.to.value === number) {
            return interval.to.included;
        }

        return (Math.min(interval.from.value, number) === interval.from.value &&
            Math.max(interval.to.value, number) === interval.to.value);
    }
    return false;
}

const default_config = {
    locales: undefined,
    fallbacks: {},
    default_locale: undefined,
    auto_reload: false,
    directory: undefined,
    extension: ".json",
    object_notation: ".",
    prefix: "",
    indent: 2,
    update_files: false,
};

class I18n extends events.EventEmitter {
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {Object} opts
     * @param {{ [code: string]: any } | string[]} [opts.locales]
     * @param {{ [code: string]: any }} [opts.fallbacks]
     * @param {string} opts.default_locale
     * @param {boolean} [opts.auto_reload]
     * @param {string} opts.directory
     * @param {string} [opts.extension]
     * @param {string} [opts.object_notation]
     * @param {string} [opts.prefix]
     * @param {number} [opts.indent]
     * @param {boolean} [opts.update_files]
     */
    constructor(opts) {
        super();

        opts = Object.assign({}, default_config, opts);
        if (opts.default_locale == undefined) throw new TypeError("Default locale was not specified!");
        if (opts.directory == undefined) throw new TypeError("Locale directory path was not specified!");

        this.fallbacks = opts.fallbacks;
        this.default_locale = opts.default_locale;
        this.auto_reload = opts.auto_reload;
        this.directory = opts.directory;
        this.extension = opts.extension;
        this.object_notation = opts.object_notation;
        this.prefix = opts.prefix;
        this.indent = opts.indent;
        this.update_files = opts.update_files;

        // when missing locales we try to guess that from directory
        const locales = opts.locales || this.guessLocales(this.directory);

        // implicitly read all locales
        if (Array.isArray(locales)) {
            this.locales = {};
            locales.forEach(l => this.read(l));

            // auto reload locale files when changed
            if (this.auto_reload) {
                const updatable = new Set;

                const updater = debounce(() => {
                    for (let filename of updatable.values()) {
                        const localeFromFile = this.guessLocaleFromFile(filename);

                        if (localeFromFile && locales.indexOf(localeFromFile) > -1) {
                            log("Auto reloading locale file \"" + filename + "\"");
                            this.read(localeFromFile);
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

    localeAccessor(locale, id) {
        // Bail out on non-existent locales to defend against internal errors.
        if (!this.locales[locale]) return null;

        // Handle object lookup notation
        const index_of_dot = id.lastIndexOf(this.object_notation);
        if (index_of_dot > 0 && index_of_dot < id.length - 1) {
            // Split the provided term and run the callback for each subterm.
            return id.split(this.object_notation).reduce((object, index) => {
                if (object === null || !(index in object)) return null;
                return object[index];
            }, this.locales[locale]);
        } else {
            // No object notation, just return an accessor that performs array lookup.
            return this.locales[locale][id];
        }
    }

    localeMutator(locale, id, value, allow_branching = true) {
        // Bail out on non-existent locales to defend against internal errors.
        if (!this.locales[locale]) return;

        // Handle object lookup notation
        const index_of_dot = id.lastIndexOf(this.object_notation);
        if (index_of_dot > 0 && index_of_dot < id.length - 1) {
            // Split the provided term and run the callback for each subterm.
            const split = id.split(this.object_notation);
            const path = split.slice(0, -1);
            const index = split[split.length - 1];

            const obj = path.reduce((object, index) => {
                if (object == null) return null;

                // If our current target object (in the locale tree) doesn't exist or
                // it doesn't have the next subterm as a member...
                if (!(index in object)) {
                    // ...check if we're allowed to create new branches.
                    if (allow_branching) {
                        object[index] = {};
                    } else {
                        return null;
                    }
                }

                // Return a reference to the next deeper level in the locale tree.
                return object[index];
            }, this.locales[locale]);

            if (!obj) return;

            obj[index] = value;
        } else {
            // No object notation, just return an accessor that performs array lookup.
            return this.locales[locale][id] = value;
        }
    }

    _translate(locale, id, default_msg) {
        if (locale === undefined) {
            locale = this.default_locale;
        }

        if (!this.locales[locale] && this.fallbacks[locale]) {
            locale = this.fallbacks[locale];
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

        let msg = this.localeAccessor(locale, id);
        if (!msg && default_config && this.update_files) {
            this.localeMutator(this.default_locale, id, default_msg);
            this.write(locale);
        }

        msg = msg || default_msg || id;
        if (msg === "") msg = default_msg;

        return msg;
    }

    /**
     * @param {string} locale
     * @param {string} id
     * @param {string|{}} phrase
     * @param {{}} args
     * @returns {string}
     */
    translate(locale, id, phrase, args) {
        if (!args && typeof phrase === "object") {
            args = phrase;
            phrase = null;
        }
        if (!args) args = {};
        if (!phrase) phrase = null;

        let msg = this._translate(locale, id, phrase);

        if (typeof msg === "object" && msg.one) { // postprocess to get compatible to plurals
            msg = msg.one;
        } else if (typeof msg === "object" && msg.other) { // in case there is no 'one' but an 'other' rule
            msg = msg.other;
        }

        // head over to postProcessing
        return postProcess(msg, args);
    }

    /**
     * @param {string} locale
     * @param {string} id
     * @param {[string, string]|{ singular: string, plural: string }|{ one: string, other: string }|number} phrase
     * @param {number|{}} count
     * @param {{}} args
     * @returns {string}
     */
    translateN(locale, id, phrase, count, args) {
        if (typeof phrase === "number" && !args) {
            count = phrase;
            phrase = null;
            args = count;
        }
        if (typeof phrase === "object" && phrase.singular) phrase = { one: phrase.singular, other: phrase.plural || phrase.singular };
        if (Array.isArray(phrase)) phrase = { one: phrase[0], other: phrase[1] || phrase[0] };
        if (!args) args = {};

        let msg = this._translate(locale, id, phrase);

        // find the correct plural rule for given locale
        if (typeof msg === "object") {
            // use Intl to check native plural rules and format the lang
            const supported = Intl.PluralRules.supportedLocalesOf([locale]);
            locale = supported.length > 0 ? supported[0] : locale;
            try {
                if (!PluralsForLocale[locale]) PluralsForLocale[locale] = Intl.PluralRules(locale, { type: "cardinal" });
                if (!PluralsForLocale[locale]) throw new Error("Move on to catch statement");
                // fallback to 'other' on case of missing translations
                msg = msg[PluralsForLocale[locale].select(count)] || msg.other;
            } catch (_) {
                // split locales with a region code
                const lc = locale.toLowerCase()
                    .split(/[_-\s]+/)
                    .filter(el => true && el);
                // take the first part of locale, fallback to full locale
                locale = lc[0] || locale;

                // fallback to 'other' on case of missing translations
                msg = (typeof plurals[locale] === "function" && msg[plurals[locale](count)]) || msg.other;
            }
        }

        // head over to postProcessing
        return postProcess(msg, args, count);
    }

    translateHashed(id, phrase, args) {
        const translations = {};
        Object.keys(this.locales).sort().forEach(locale => {
            translations[locale] = this.translate(locale, id, phrase, args);
        });
        return translations;
    }

    translateNHashed(id, phrase, count, args) {
        const translations = {};
        Object.keys(this.locales).sort().forEach(locale => {
            translations[locale] = this.translate(locale, id, phrase, count, args);
        });
        return translations;
    }

    getTranslator(locale) {
        return new I18nLocale(this, locale);
    }

    // Locale Catalog

    getLocales() {
        return Object.keys(this.locales).filter(locale => locale in plurals);
    }

    hasLocale(locale) {
        return locale in this.locales && locale in plurals;
    }

    addLocale(locale) {
        this.read(locale);
    }

    removeLocale(locale) {
        delete this.locales[locale];
    }

    // File system

    /**
     * Read a locale file into memory
     * @param {string} locale
     */
    read(locale) {
        const file = this.getStorageFilePath(locale);
        try {
            log("read " + file + " for locale: " + locale);
            const localeFile = fs.readFileSync(file, { encoding: "utf8" });
            try {
                // parsing filecontents to locales[locale]
                this.locales[locale] = JSON.parse(localeFile);

                this.emit("read", { locale, file });
            } catch (parseError) {
                log.error("Unable to parse locales from file (maybe " +
                    file + " is empty or invalid json?):", parseError);
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
     * @param {string} locale
     */
    write(locale) {
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
                log.error("unable to write locales to file (either " +
                    tmp + " or " + target + " are not writeable?): ");
            }
        } catch (e) {
            log.error("unexpected error writing files (either " +
                tmp + " or " + target + " are not writeable?): ", e);
        }
    }

    guessLocales(directory) {
        const entries = fs.readdirSync(directory);
        const localesFound = [];

        for (var i = entries.length - 1; i >= 0; i--) {
            if (entries[i].match(/^\./)) continue;
            var localeFromFile = this.guessLocaleFromFile(entries[i]);
            if (localeFromFile) localesFound.push(localeFromFile);
        }

        return localesFound.sort();
    }

    guessLocaleFromFile(filename) {
        const prefixRegex = new RegExp("^" + this.prefix, "g");
        const extensionRegex = new RegExp(this.extension + "$", "g");

        if (this.prefix !== "" && !filename.match(prefixRegex)) return false;
        if (this.extension !== "" && !filename.match(extensionRegex)) return false;
        return filename.replace(prefixRegex, "").replace(extensionRegex, "");
    }

    /**
     * basic normalization of filepath
     * @param {string} locale
     * @returns {string}
     */
    getStorageFilePath(locale) {
        return path.normalize(path.join(this.directory, this.prefix + locale + this.extension));
    }
}

module.exports = I18n;
