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
    esc("r"),
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
