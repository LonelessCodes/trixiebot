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

const merge = (...inputs) => inputs.join("");
const groupNon = input => `(?:${input})`;
const group = input => `(${input})`;
const negateLookahead = input => `(?!${input})`;
const or = (...inputs) => inputs.join("|");
const set = input => `[${input}]`;
const negateSet = input => `[^${input}]`;
const plus = input => `${input}+`;
const star = input => `${input}*`;
// const quantify = (input, quantity) => `${input}{${quantity}}`;
// const optional = input => `${input}?`;
const esc = input => `\\${input}`;

const regex = (input, flags) => new RegExp(input, flags);

// Following the ECMAScript 2019 specification https://www.ecma-international.org/ecma-262/#sec-literals-regular-expression-literals

const r_line_terminator = merge(
    esc("n"),
    esc("r")
);
const non_terminator = (input = "") => negateSet(r_line_terminator + input);

const r_backslash_seq = merge(esc("\\"), non_terminator());
const r_class_char = or(
    non_terminator(merge(esc("]"), esc("\\"))),
    r_backslash_seq
);
const r_class_chars = star(groupNon(r_class_char));
const r_class = merge(esc("["), r_class_chars, esc("]"));
const r_char = or(
    non_terminator(merge(esc("["), "/" + esc("\\"))),
    r_backslash_seq,
    r_class
);
const r_chars = plus(groupNon(r_char));

const r_first_char = negateLookahead(set("*+?"));

const r_body = group(merge(r_first_char, r_chars));
const r_flags = star(group(set("a-zA-Z")));
const r_literal = merge(esc("/"), r_body, esc("/"), r_flags);

const regex_regex = regex(r_literal);

module.exports = regex_regex;
