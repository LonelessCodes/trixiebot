const Comlink = require("comlink");
const childProcessAdapter = require("../../../modules/concurrency/childProcessAdapter");

const lexer = require("./lexer/lexer");
const parser = require("./parser");
const Interpreter = require("./interpreter/Interpreter");
const { ObjectLiteral } = require("./interpreter/types");
const { ParserError, TokenizerError } = require("./errors");

function parseTokenizerErrors(errors) {
    return errors.map(err => new TokenizerError(err));
}
function parseParserErrors(errors) {
    return errors.map(err => new ParserError(err));
}

function compileCC(code) {
    // Tokenize the input
    const lexer_result = lexer.tokenize(code);
    if (lexer_result.errors.length > 0)
        throw parseTokenizerErrors(lexer_result.errors);

    // 2. Parse the Tokens vector.
    parser.input = lexer_result.tokens;
    parser.text_input = code;
    const cst = parser.Program();

    if (parser.errors.length > 0)
        throw parseParserErrors(parser.errors);

    return cst;
}

async function runCC(commandId, code, cst, message) {
    const interpreter = new Interpreter(commandId, message.guild.id);

    try {
        // 3. Perform semantics using a CstVisitor.
        // Note that separation of concerns between the syntactic analysis (parsing) and the semantics.
        interpreter.text_input = code;
        const reply = await interpreter.visit(cst, message);
        if (reply instanceof ObjectLiteral && reply.isEmbed) {
            return { embed: reply.getEmbed() };
        }
        return { content: reply ? reply.native : null };
    } catch (error) {
        return { error };
    }
}

Comlink.expose({
    lint(code) {
        try {
            compileCC(code);
            return { errors: [] };
        } catch (errs) {
            return { errors: errs };
        }
    },
    compile(code) {
        try {
            return { cst: compileCC(code), errors: [] };
        } catch (errs) {
            return { cst: undefined, errors: errs };
        }
    },
    run({ id, code, cst, message }) {
        return runCC(id, code, cst, message);
    },
}, childProcessAdapter(process));

Comlink.wrap(childProcessAdapter(process)).ready();
