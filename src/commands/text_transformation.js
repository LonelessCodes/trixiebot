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

const tinytext = require("tiny-text");

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const CommandScope = require("../util/commands/CommandScope").default;

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
        .replace(/(!+|\?+|((?<!\.)\.(?!\.)))/g, match => (match[0] in faces ? " " + random(faces[match[0]]) : match));
}

function casing(input) {
    return input
        .split(/(?<=[!.?]\s*)/g)
        .map(satz => satz[0].toUpperCase() + satz.slice(1).toLowerCase())
        .join("");
}

function stutter(input) {
    return input
        .split(/\s+/)
        .map(word => {
            const r = Math.random();
            if (r > 0.15 || word === "") return word;

            return word[0] + ("-" + word[0]).repeat(r > 0.05 ? 1 : 2) + word.slice(1);
        })
        .join(" ");
}

function transform(input) {
    return input
        .split(/\s+/g)
        .map(word =>
            word
                .replace(/^you$/gi, "u")
                .replace(/^your$/gi, "ur")
                .replace(/^you're$/gi, "ur")
                .replace(/l/gi, "w")
                .replace(/v/gi, "w")
                .replace(/th/gi, "t")
                .replace(/^no/i, "nwo")
                .replace(/d(?!$)/gi, "w")
                .replace(/o$/i, "ow")
                .replace(/r([aeiou])/gi, (_, match) => `w${match}`)
                .replace(/(?<=\w)([^AEIOUaeiou]+)ou/, (_, match) => `${"w".repeat(match.length)}ou`)
                .replace(/eou/, "ewou")
        )
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

module.exports = function install(cr) {
    cr.registerCommand("smol", new OverloadCommand())
        .registerOverload(
            "1+",
            new SimpleCommand(({ message, content, ctx }) => {
                const mention = message.channel.type === "text" && ctx.mentions.members.first();
                if (!mention) {
                    const text = content.replace(/[^\S\x0a\x0d]+/g, " ");
                    return tinytext(text);
                }
                return tinytext(mention.displayName);
            })
        )
        .setHelp(
            new HelpContent()
                .setUsage("<string|user>", "Make teeeeny tiny text")
                .addParameter("string|user", "text or user to smollerize uwu")
        )
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);
    cr.registerAlias("smol", "small");

    cr.registerCommand("owo", new OverloadCommand())
        .registerOverload("1+", new SimpleCommand(({ content }) => translateOwo(content)))
        .setHelp(new HelpContent()
            .setUsage("<text>", "Translate anything to h-hewwo language")
            .addParameter("text", "The text to translate"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);
};
