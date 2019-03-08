const { Tokenizer, Rule } = require("./Tokenizer");

const KEYWORDS = ["if", "then", "else", "do", "while", "for", "break", "continue", "reply", "return", "func"];

const lexer = new Tokenizer();
lexer.setDebugEnabled(true);

let str = "";
lexer.addRules([
    // STRINGS
    new Rule("default", "\"", ctx => {
        ctx.pushState("dqstring");
        ctx.ignore();
    }),
    new Rule("dqstring", "\"", ctx => {
        ctx.popState();
        ctx.accept("STRING", str);
        str = "";
    }),
    new Rule("dqstring", "\n", ctx => {
        throw ctx.error("Unterminated string constant");
    }),
    new Rule("dqstring", /[^\n\"]+/, (ctx, match) => {
        ctx.ignore();
        str += match[0]
            .replace(/\\"/g, "\"")
            .replace(/\\r/g, "\r")
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\b/g, "\b")
            .replace(/\\f/g, "\f")
            .replace(/\\[0-7]{1,3}/g, str => {
                // octal escape sequence
                const charCode = parseInt(str.substr(1), 8);
                if (charCode > 255) throw ctx.error("Constant is out of bounds");
                return String.fromCharCode(charCode);
            })
            .replace(/\\/g, "");
    }),

    // BLOCK COMMENTS
    new Rule("*", "/*", ctx => {
        ctx.pushState("comment");
        ctx.ignore();
    }),
    new Rule("comment", /[^*]+|\*+[^*/]+/, ctx => ctx.ignore()), // eat anything that's not a '*' or eat '*'s not followed by '/'s
    new Rule("comment", /\*+\//, ctx => {
        ctx.popState();
        ctx.ignore();
    }),
    
    // SINGLE LINE COMMENT
    new Rule("*", /\/\/.*?$/gm, ctx => ctx.ignore()),

    new Rule(KEYWORDS, ctx => ctx.accept("KEYWORD")),

    // EXPONENT
    new Rule(/([0-9]+(?:\.[0-9]+)?)[eE]([+-]?[0-9]+)\b/, (ctx, match) => {
        ctx.accept("NUMBER", parseFloat(match[1]) * Math.pow(10, parseInt(match[2])));
    }),
    // NUMBER
    new Rule(/[0-9]+(?:\.[0-9]+)?\b/, (ctx, match) => {
        ctx.accept("NUMBER", parseFloat(match[0]));
    }),
    // HEX
    new Rule(/0x([0-9a-f]+)\b/i, (ctx, match) => {
        ctx.accept("NUMBER", parseInt(match[1], 16));
    }),
    // OCTA
    new Rule(/0o([0-7]+)\b/i, (ctx, match) => {
        ctx.accept("NUMBER", parseInt(match[1], 8));
    }),
    // BINARY
    new Rule(/0b([01]+)\b/i, (ctx, match) => {
        ctx.accept("NUMBER", parseInt(match[1], 2));
    }),

    // MATH OP
    new Rule(/[+\-*/%]=/, ctx => ctx.accept("COMPOUND_ASSIGN")),
    new Rule(/[+\-*/%]/, ctx => ctx.accept("MATH_OP")),

    new Rule(["==", "!=", "<", ">", "<=", ">="], ctx => ctx.accept("COMPARE")),

    // ALL THE OTHER STUFF
    // new Rule(/(?:\r?\n)+/, ctx => ctx.accept("LINEBREAK")),
    new Rule(/\s+/, ctx => ctx.ignore()),
]);

// lexer.setInput(`
// reply "owo what's this. " + var + " users in this server. Makes a factorial of " + factorial(var)
// `);
lexer.setInput(" 0xff 0o56 0b10111010 -235.24 465e-4 \"string here\" + \"and another one\" /* owo this is a comment */ 0 // comment number 0\n");
// lexer.setInput(
//     "2.0 \"simple text\" 2.0\n" +
//     "2.0 \"text with octal ~\\41~ value\" 2.0\n" +
//     "2.0 \"text with escaped ~\\n~ new line\" 2.0\n" +
//     "2.0 \"text with escaped ~\\t~ tab\" 2.0\n" +
//     "2.0 \"text with escaped ~\\r~ carriage return\" 2.0\n" +
//     "2.0 \"text with escaped ~\\b~ backspace\" 2.0\n" +
//     "2.0 \"text with escaped ~\\f~ form feed\" 2.0\n" +
//     "2.0 \"text with escaped ~\\s~ char\" 2.0\n"
// );
lexer.getAllTokens().forEach(token => {
    console.log(token.toString());
});