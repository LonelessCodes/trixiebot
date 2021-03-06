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

const chevrotain = require("chevrotain");
const { Lexer } = chevrotain;
const regex_regex = require("../regex");

// eslint-disable-next-line valid-jsdoc
/**
 *  Utility to avoid manually building the ALL_TOKENS array
 * @param {chevrotain.ITokenConfig & { matched?: (match: RegExpExecArray) => any}} options
 * @returns {RegExpExecArray}
 */
function createToken(options) {
    const { matched, pattern } = options;
    if (typeof matched === "function" && pattern instanceof RegExp) {
        options.pattern = (text, startOffset) => {
            pattern.index = startOffset;
            const result = pattern.exec(text);

            if (result) {
                if (result.index !== startOffset) return null;
                const payload = matched(result);
                result.payload = payload;
            }

            return result;
        };
        delete options.matched;
    }

    return chevrotain.createToken(options);
}

// Whitespace
const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /[\t\f\v\u0020\u2028\u2029\u00A0\uFEFF]+/, group: Lexer.SKIPPED });

const LineTerminator = createToken({
    name: "LineTerminator",
    pattern: /(?:\r?\n)+/,
    // categories: WhiteSpace,
    group: Lexer.SKIPPED,
    line_breaks: true,
});

// Comments
const SingleLineComment = createToken({ name: "SingleLineComment", pattern: /\/\/[^\r\n]*/, group: Lexer.SKIPPED, start_chars_hint: ["/"] });
const MultiLineComment = createToken({ name: "MultiLineComment", pattern: /\/\*(?:[\s\S]*?)\*\//, group: Lexer.SKIPPED, start_chars_hint: ["/"], line_breaks: true });

// An identifier name. This is anything, a variable or a reserved keyword
const IdentifierName = createToken({ name: "IdentifierName", pattern: Lexer.NA });

const Keyword = createToken({
    name: "Keyword",
    pattern: Lexer.NA,
    categories: IdentifierName,
});

const keyword = (name, match, opts = {}) => createToken({
    name,
    pattern: new RegExp("\\b" + match + "\\b"),
    categories: Keyword,
    ...opts,
});

// const VarTok = keyword("VarTok", "var");
const FuncTok = keyword("FuncTok", "func");
const ReturnTok = keyword("ReturnTok", "return");
const ForTok = keyword("ForTok", "for");
const OfTok = keyword("OfTok", "of");
const WhileTok = keyword("WhileTok", "while");
const BreakTok = keyword("BreakTok", "break");
const ContinueTok = keyword("ContinueTok", "continue");
const IfTok = keyword("IfTok", "if");
const ThenTok = keyword("ThenTok", "then");
const ElseTok = keyword("ElseTok", "else");
const SleepTok = keyword("SleepTok", "sleep");
const ReplyTok = keyword("ReplyTok", "reply");

const LogicOperator = createToken({ name: "LogicOperator", pattern: Lexer.NA, categories: IdentifierName });

const AndTok = keyword("AndTok", "and", { categories: LogicOperator });
const OrTok = keyword("OrTok", "or", { categories: LogicOperator });

const Punctuator = createToken({ name: "Punctuator", pattern: Lexer.NA });

const OpenCurly = createToken({ name: "OpenCurly", pattern: "{", categories: Punctuator });
const CloseCurly = createToken({ name: "CloseCurly", pattern: "}", categories: Punctuator });
const OpenParen = createToken({ name: "OpenParen", pattern: "(", categories: Punctuator });
const CloseParen = createToken({ name: "CloseParen", pattern: ")", categories: Punctuator });
const OpenBracket = createToken({ name: "OpenBracket", pattern: "[", categories: Punctuator });
const CloseBracket = createToken({ name: "CloseBracket", pattern: "]", categories: Punctuator });

const Dot = createToken({ name: "Dot", pattern: ".", categories: Punctuator });
const Colon = createToken({ name: "Colon", pattern: ":", categories: Punctuator });
const Semicolon = createToken({ name: "Semicolon", pattern: ";", categories: Punctuator });
const Comma = createToken({ name: "Comma", pattern: ",", categories: Punctuator });
const Exclamation = createToken({ name: "Exclamation", pattern: "!", categories: Punctuator });

const Decrement = createToken({ name: "Decrement", pattern: "--", categories: Punctuator });
const Increment = createToken({ name: "Increment", pattern: "++", categories: Punctuator });

const MultiOperator = createToken({ name: "MultiOperator", pattern: Lexer.NA, categories: Punctuator });

const OP_Multiple = createToken({ name: "OP_Multiply", pattern: "*", categories: MultiOperator });
const OP_Division = createToken({ name: "OP_Division", pattern: "/", categories: MultiOperator });
const OP_Percent = createToken({ name: "OP_Percent", pattern: "%", categories: MultiOperator });

const ExponentiationOperator = createToken({ name: "ExponentiationOperator", pattern: Lexer.NA, categories: Punctuator });
const OP_Exponent = createToken({ name: "OP_Exponent", pattern: "^", categories: ExponentiationOperator });

const AdditiveOperator = createToken({ name: "AdditiveOperator", pattern: Lexer.NA, categories: Punctuator });

const OP_Plus = createToken({ name: "OP_Plus", pattern: "+", categories: AdditiveOperator });
const OP_Minus = createToken({ name: "OP_Minus", pattern: "-", categories: AdditiveOperator });

const CompareOperator = createToken({ name: "CompareOperator", pattern: Lexer.NA, categories: Punctuator });

const RelationOperator = createToken({ name: "RelationOperator", pattern: Lexer.NA, categories: CompareOperator });

const LessThan = createToken({ name: "LessThan", pattern: "<", categories: RelationOperator });
const GreaterThan = createToken({ name: "GreaterThan", pattern: ">", categories: RelationOperator });
const LessThanEqual = createToken({ name: "LessThanEqual", pattern: "<=", categories: RelationOperator });
const GreaterThanEqual = createToken({ name: "GreaterThanEqual", pattern: ">=", categories: RelationOperator });

const EqualityOperator = createToken({ name: "EqualityOperator", pattern: Lexer.NA, categories: CompareOperator });

const Compare_Equal = createToken({ name: "Compare_Equal", pattern: "==", categories: EqualityOperator });
const Compare_NotEqual = createToken({ name: "Compare_NotEqual", pattern: "!=", categories: EqualityOperator });

const AssignOperator = createToken({ name: "AssignOperator", pattern: Lexer.NA, categories: Punctuator });

const Equal = createToken({ categories: AssignOperator, name: "Equal", pattern: "=" });
const OP_AssignPlus = createToken({ categories: AssignOperator, name: "OP_AssignPlus", pattern: "+=" });
const OP_AssignMinus = createToken({ categories: AssignOperator, name: "OP_AssignMinus", pattern: "-=" });
const OP_AssignMultiple = createToken({ categories: AssignOperator, name: "OP_AssignMultiple", pattern: "*=" });
const OP_AssignDivision = createToken({ categories: AssignOperator, name: "OP_AssignDivision", pattern: "/=" });
const OP_AssignPercent = createToken({ categories: AssignOperator, name: "OP_AssignPercent", pattern: "%=" });
const OP_AssignExponent = createToken({ categories: AssignOperator, name: "OP_AssignExponent", pattern: "^=" });

const Literal = createToken({ name: "Literal", pattern: Lexer.NA });

const NullTok = keyword("NullTok", "null", { categories: Literal });

const BooleanLiteral = createToken({ name: "BooleanLiteral", pattern: Lexer.NA, categories: Literal });

const TrueTok = keyword("TrueTok", "true", { categories: BooleanLiteral });
const FalseTok = keyword("FalseTok", "false", { categories: BooleanLiteral });

const NumbericLiteral = createToken({ name: "NumbericLiteral", pattern: Lexer.NA, categories: Literal });

const DecimalLiteral = createToken({
    categories: NumbericLiteral, name: "DecimalLiteral", pattern: /(?:[0-9]+(?:\.[0-9]+)?)(?:e[+-]?[0-9]+)?\b/i,
    start_chars_hint: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
});
const HexLiteral = createToken({
    categories: NumbericLiteral, name: "HexLiteral", pattern: /0x([0-9a-f]+)\b/i, start_chars_hint: ["0"],
});
const OctalLiteral = createToken({
    categories: NumbericLiteral, name: "OctalLiteral", pattern: /0o([0-7]+)\b/i, start_chars_hint: ["0"],
});
const BinaryLiteral = createToken({
    categories: NumbericLiteral, name: "BinaryLiteral", pattern: /0b([01]+)\b/i, start_chars_hint: ["0"],
});

const StringLiteral = createToken({
    categories: Literal,
    name: "StringLiteral",
    pattern: /(?:"([^"\n]*)")|(?:'([^'\n]*)')/,
    start_chars_hint: ["\"", "'"],
});

const RegExpLiteral = createToken({
    categories: Literal,
    name: "RegExpLiteral",
    pattern: regex_regex,
    start_chars_hint: "/",
});

const Identifier = createToken({ name: "Identifier", pattern: /([A-Za-z_$][A-Za-z0-9_$]*)/, categories: IdentifierName });

exports.ALL_TOKENS = [
    // First
    WhiteSpace, LineTerminator, SingleLineComment, MultiLineComment,

    Literal, RegExpLiteral, StringLiteral, NullTok, BooleanLiteral, TrueTok, FalseTok,
    NumbericLiteral, HexLiteral, OctalLiteral, BinaryLiteral, DecimalLiteral,

    Punctuator, OpenCurly, CloseCurly, OpenParen, CloseParen, OpenBracket, CloseBracket,
    Dot, Colon, Semicolon, Comma, Exclamation,

    Decrement, Increment,

    AssignOperator, OP_AssignPlus, OP_AssignMinus, OP_AssignMultiple, OP_AssignDivision,
    OP_AssignPercent, OP_AssignExponent,

    AdditiveOperator, OP_Plus, OP_Minus,
    MultiOperator, OP_Multiple, OP_Division, OP_Percent,
    ExponentiationOperator, OP_Exponent,

    CompareOperator,
    RelationOperator, LessThanEqual, GreaterThanEqual, LessThan, GreaterThan,
    EqualityOperator, Compare_NotEqual, Compare_Equal,

    Equal,

    IdentifierName,
    // Keywords
    Keyword, /* VarTok ,*/ FuncTok, ReturnTok, ForTok, OfTok, WhileTok, BreakTok,
    ContinueTok, IfTok, ThenTok, ElseTok, SleepTok, ReplyTok,
    LogicOperator, AndTok, OrTok,

    // Last
    Identifier,
];

exports.tokens = {
    // First
    WhiteSpace, LineTerminator, SingleLineComment, MultiLineComment,

    Literal, RegExpLiteral, StringLiteral, NullTok, BooleanLiteral, TrueTok, FalseTok,
    NumbericLiteral, HexLiteral, OctalLiteral, BinaryLiteral, DecimalLiteral,

    Punctuator, OpenCurly, CloseCurly, OpenParen, CloseParen, OpenBracket, CloseBracket,
    Dot, Colon, Semicolon, Comma, Exclamation,

    Decrement, Increment,

    AssignOperator, Equal, OP_AssignPlus, OP_AssignMinus, OP_AssignMultiple, OP_AssignDivision,
    OP_AssignPercent, OP_AssignExponent,

    AdditiveOperator, OP_Plus, OP_Minus,
    MultiOperator, OP_Multiple, OP_Division, OP_Percent,
    ExponentiationOperator, OP_Exponent,

    CompareOperator,
    RelationOperator, LessThanEqual, GreaterThanEqual, LessThan, GreaterThan,
    EqualityOperator, Compare_NotEqual, Compare_Equal,

    IdentifierName,
    // Keywords
    Keyword, /* VarTok ,*/ FuncTok, ReturnTok, ForTok, OfTok, WhileTok, BreakTok,
    ContinueTok, IfTok, ThenTok, ElseTok, SleepTok, ReplyTok,
    LogicOperator, AndTok, OrTok,

    // Last
    Identifier,
};
