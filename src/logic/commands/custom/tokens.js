const chevrotain = require("chevrotain");
const { Lexer } = chevrotain;

/**
 *  Utility to avoid manually building the ALL_TOKENS array
 * @param {chevrotain.ITokenConfig & { matched?: (match: RegExpExecArray) => any}} options
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

    return chevrotain.createToken(options);;
}

// Whitespace
const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /[\t\f\v\u0020\u2028\u2029\u00A0\uFEFF]+/, group: Lexer.SKIPPED });

// TERMINATORS
const Terminator = createToken({ name: "Terminator", pattern: Lexer.NA });

const LineTerminator = createToken({
    name: "LineTerminator",
    pattern: /(?:\r?\n)+/,
    categories: Terminator,
    line_breaks: true,
});

// Comments
const SingleLineComment = createToken({ name: "SingleLineComment", pattern: /\/\/[^\r\n]*/, group: Lexer.SKIPPED });
const MultiLineComment = createToken({ name: "MultiLineComment", pattern: /\/\*(?:[\s\S]*?)\*\//, group: Lexer.SKIPPED });

// An identifier name. This is anything, a variable or a reserved keyword
const IdentifierName = createToken({ name: "IdentifierName", pattern: Lexer.NA });

const Keyword = createToken({
    name: "Keyword",
    pattern: Lexer.NA,
    categories: IdentifierName
});

const keyword = (name, match, opts = {}) => createToken({ name, pattern: new RegExp("\\b" + match + "\\b"), categories: Keyword, ...opts });

const VarTok = keyword("VarTok", "var");
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
const Semicolon = createToken({ name: "Semicolon", pattern: ";", categories: [Terminator, Punctuator] });
const Comma = createToken({ name: "Comma", pattern: ",", categories: Punctuator });
const Exclamation = createToken({ name: "Exclamation", pattern: "!", categories: Punctuator });

const Decrement = createToken({ name: "Decrement", pattern: "--", categories: Punctuator });
const Increment = createToken({ name: "Increment", pattern: "++", categories: Punctuator });

const MultiOperator = createToken({ name: "MultiOperator", pattern: Lexer.NA, categories: Punctuator });

const OP_Multiple = createToken({ name: "OP_Multiply", pattern: /\*/, categories: MultiOperator });
const OP_Division = createToken({ name: "OP_Division", pattern: /\//, categories: MultiOperator });
const OP_Percent = createToken({ name: "OP_Percent", pattern: /\%/, categories: MultiOperator });
const OP_Exponent = createToken({ name: "OP_Exponent", pattern: /\^/, categories: MultiOperator });

const AdditiveOperator = createToken({ name: "AdditiveOperator", pattern: Lexer.NA, categories: Punctuator });

const OP_Plus = createToken({ name: "OP_Plus", pattern: /\+/, categories: AdditiveOperator });
const OP_Minus = createToken({ name: "OP_Minus", pattern: /-/, categories: AdditiveOperator });

const CompareOperator = createToken({ name: "CompareOperator", pattern: Lexer.NA, categories: Punctuator });

const RelationOperator = createToken({ name: "RelationOperator", pattern: Lexer.NA, categories: CompareOperator });

const LessThan = createToken({ name: "LessThan", pattern: /</, categories: RelationOperator });
const GreaterThan = createToken({ name: "GreaterThan", pattern: />/, categories: RelationOperator });
const LessThanEqual = createToken({ name: "LessThanEqual", pattern: /<=/, categories: RelationOperator });
const GreaterThanEqual = createToken({ name: "GreaterThanEqual", pattern: />=/, categories: RelationOperator });

const EqualityOperator = createToken({ name: "EqualityOperator", pattern: Lexer.NA, categories: CompareOperator });

const Compare_Equal = createToken({ name: "Compare_Equal", pattern: /==/, categories: EqualityOperator });
const Compare_NotEqual = createToken({ name: "Compare_NotEqual", pattern: /!=/, categories: EqualityOperator });

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
    // matched: match => parseFloat(match[1]) * (match[2] ? Math.pow(10, parseInt(match[2])) : 1)
});
const HexLiteral = createToken({
    categories: NumbericLiteral, name: "HexLiteral", pattern: /0x([0-9a-f]+)\b/i,
    // matched: match => parseInt(match[1], 16)
});
const OctalLiteral = createToken({
    categories: NumbericLiteral, name: "OctalLiteral", pattern: /0o([0-7]+)\b/i,
    // matched: match => parseInt(match[1], 8)
});
const BinaryLiteral = createToken({
    categories: NumbericLiteral, name: "BinaryLiteral", pattern: /0b([01]+)\b/i,
    // matched: match => parseInt(match[1], 2)
});

const StringLiteral = createToken({
    categories: Literal,
    name: "StringLiteral",
    pattern: /(?:"([^\n\"]*)")|(?:'([^\n\']*)')/,
    // matched(match) {
    //     let str = match[1].replace(/\\\\/g, "\\");
    //     if (match[0].startsWith("'")) str = str.replace(/\\'/g, "'");
    //     else str = str.replace(/\\"/g, "\"");
    //     str = str.replace(/\\r/g, "\r")
    //         .replace(/\\n/g, "\n")
    //         .replace(/\\t/g, "\t")
    //         .replace(/\\b/g, "\x08")
    //         .replace(/\\f/g, "\f")
    //         .replace(/\\[0-7]{1,3}/g, str => {
    //             // octal escape sequence
    //             const charCode = parseInt(str.substr(1), 8);
    //             if (charCode > 255) throw ctx.error("Constant is out of bounds");
    //             return String.fromCharCode(charCode);
    //         })
    //         .replace(/\\u[0-9a-fA-F]{4}/g, str => {
    //             // octal escape sequence
    //             const charCode = parseInt(str.substr(2), 16);
    //             if (charCode > 65535) throw ctx.error("Constant is out of bounds");
    //             return String.fromCharCode(charCode);
    //         })
    //         .replace(/\\/g, "");
    //     return str;
    // }
});

const Identifier = createToken({ name: "Identifier", pattern: /([A-Za-z_$][A-Za-z0-9_$]*)/, categories: IdentifierName });

exports.ALL_TOKENS = [
    // First
    WhiteSpace, SingleLineComment, MultiLineComment,
    Terminator,

    Literal, StringLiteral, NullTok, BooleanLiteral, TrueTok, FalseTok,
    NumbericLiteral, HexLiteral, OctalLiteral, BinaryLiteral, DecimalLiteral,

    Punctuator, OpenCurly, CloseCurly, OpenParen, CloseParen, OpenBracket, CloseBracket,
    Dot, Colon, Semicolon, Comma, Exclamation,

    Decrement, Increment,

    AssignOperator, Equal, OP_AssignPlus, OP_AssignMinus, OP_AssignMultiple, OP_AssignDivision, OP_AssignPercent, OP_AssignExponent,

    AdditiveOperator, OP_Plus, OP_Minus,
    MultiOperator, OP_Multiple, OP_Division, OP_Percent, OP_Exponent,

    CompareOperator,
    RelationOperator, LessThanEqual, GreaterThanEqual, LessThan, GreaterThan,
    EqualityOperator, Compare_NotEqual, Compare_Equal,

    IdentifierName,
    // Keywords
    Keyword, VarTok, FuncTok, ReturnTok, ForTok, OfTok, WhileTok, BreakTok, ContinueTok, IfTok, ThenTok, ElseTok, ReplyTok,
    LogicOperator, AndTok, OrTok,

    // Last
    LineTerminator,
    Identifier,
];

exports.tokens = {
    // First
    WhiteSpace, SingleLineComment, MultiLineComment,
    Terminator,

    Literal, StringLiteral, NullTok, BooleanLiteral, TrueTok, FalseTok,
    NumbericLiteral, HexLiteral, OctalLiteral, BinaryLiteral, DecimalLiteral,

    Punctuator, OpenCurly, CloseCurly, OpenParen, CloseParen, OpenBracket, CloseBracket,
    Dot, Colon, Semicolon, Comma, Exclamation,

    Decrement, Increment,

    AssignOperator, Equal, OP_AssignPlus, OP_AssignMinus, OP_AssignMultiple, OP_AssignDivision, OP_AssignPercent, OP_AssignExponent,

    AdditiveOperator, OP_Plus, OP_Minus,
    MultiOperator, OP_Multiple, OP_Division, OP_Percent, OP_Exponent,

    CompareOperator,
    RelationOperator, LessThanEqual, GreaterThanEqual, LessThan, GreaterThan,
    EqualityOperator, Compare_NotEqual, Compare_Equal,

    IdentifierName,
    // Keywords
    Keyword, VarTok, FuncTok, ReturnTok, ForTok, OfTok, WhileTok, BreakTok, ContinueTok, IfTok, ThenTok, ElseTok, ReplyTok,
    LogicOperator, AndTok, OrTok,

    // Last
    LineTerminator,
    Identifier,
};