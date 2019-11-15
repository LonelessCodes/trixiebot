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

const fetch = require("node-fetch");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");
const RateLimiter = require("../util/commands/RateLimiter");
const TimeUnit = require("../modules/TimeUnit");

const baseURL = "https://api.funtranslations.com/translate/";

/*
 * OWO Translator:
 */
function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const faces = {
    ".": ["uwu", "UvU", ";;w;;", ";;", ":3c", "=w='"],
    "!": ["UwU", "OwO", "OwO;;", "ÒwÓ"],
    "?": ["OwO;;", "? ^^;;", "? =w='", "? :<"],
};

function owos(input) {
    return input
        .replace(/(?<![.?!])$/, Math.random() > 0.7 ? " " + random(faces["."]) : "")
        .replace(/(!+|\?+|((?<!\.)\.(?!\.)))/g, match => match[0] in faces ? " " + random(faces[match[0]]) : match);
}

function casing(input) {
    return input.split(/(?<=[!.?]\s*)/g)
        .map(satz => satz[0].toUpperCase() + satz.slice(1).toLowerCase())
        .join("");
}

function stutter(input) {
    return input.split(/\s+/)
        .map(word => {
            const r = Math.random();
            if (r > 0.15 || word === "") return word;

            return word[0] + ("-" + word[0]).repeat(r > 0.05 ? 1 : 2) + word.slice(1);
        })
        .join(" ");
}

function transform(input) {
    return input.split(/\s+/g)
        .map(word => word
            .replace(/^you$/gi, "u")
            .replace(/^your$/gi, "ur")
            .replace(/^you're$/gi, "ur")
            .replace(/l/gi, "w")
            .replace(/th/gi, "t")
            .replace(/^no/i, "nwo")
            .replace(/d(?!$)/gi, "w")
            .replace(/o$/i, "ow")
            .replace(/r([aeiou])/gi, (_, match) => `w${match}`)
            .replace(/(?<=\w)([^AEIOUaeiou]+)ou/, (_, match) => `${"w".repeat(match.length)}ou`)
            .replace(/eou/, "ewou"))
        .join(" ");
}

function translateOwo(input) {
    return owos(
        stutter(
            casing(
                transform(
                    input
                )
            )
        )
    );
}

/*
 * Translator APIs
 */

async function translate(type, text) {
    const url = `${baseURL}${type}.json?text=${encodeURIComponent(text)}`;
    const request = await fetch(url);
    const { success, contents } = await request.json();
    if (!success) {
        return "Request failed for some reason :c";
    }

    return contents.translated;
}

function translator(type, description) {
    return new OverloadCommand()
        .registerOverload("1+", new SimpleCommand(({ content }) => translate(type, content)))
        .setHelp(new HelpContent()
            .setUsage("<text>", description)
            .addParameter("text", "The text to translate"))
        .setCategory(Category.TEXT)
        .setRateLimiter(new RateLimiter(TimeUnit.HOUR, 1, 2))
        .setScope(CommandScope.ALL);
}

module.exports = function install(cr) {
    cr.registerCommand("pirate", translator("pirate", "Translate something into pirate-ish"));
    cr.registerCommand("yoda", translator("yoda", "Translate something into yoda-ish"));
    cr.registerCommand("dolan", translator("dolan", "Translate something into dolan duck-ish"));

    cr.registerCommand("owo", new OverloadCommand)
        .registerOverload("1+", new SimpleCommand(({ content }) => translateOwo(content)))
        .setHelp(new HelpContent()
            .setUsage("<text>", "Translate anything to h-hewwo language")
            .addParameter("text", "The text to translate"))
        .setCategory(Category.TEXT)
        .setScope(CommandScope.ALL);
};
