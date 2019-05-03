const cpc = require("../../../modules/cpc")(process);

const lexer = require("./lexer");
const parser = require("./parser");
const { ObjectLiteral } = require("./interpreter/types");
const Interpreter = require("./interpreter/Interpreter");

async function compileCC(text) {
    // Tokenize the input
    const lexer_result = lexer.tokenize(text);
    if (lexer_result.errors.length > 0)
        throw lexer_result.errors;
    
    // 2. Parse the Tokens vector.
    parser.input = lexer_result.tokens;
    parser.text_input = text;
    const cst = parser.Program();

    if (parser.errors.length > 0)
        throw parser.errors;
    
    return cst; 
}

async function runCC(commandId, text, cst, message) {
    const interpreter = new Interpreter(commandId, message.guild.id);

    try {
        // 3. Perform semantics using a CstVisitor.
        // Note that separation of concerns between the syntactic analysis (parsing) and the semantics.
        interpreter.text_input = text;
        const reply = await interpreter.visit(cst, message);
        if (reply instanceof ObjectLiteral && reply.isEmbed) {
            return { embed: reply.getEmbed() };
        }
        return { content: reply.native };
    } catch (error) {
        return { error };
    }
}

cpc.answer("compile", async payload => {
    const { text } = payload;

    try {
        return {
            cst: await compileCC(text),
            errors: []
        };
    } catch (errs) { 
        return {
            cst: undefined,
            errors: errs
        };
    }
});

cpc.answer("run", async ({ id, text, cst, message }) => {
    try {
        return await runCC(id, text, cst, message);
    } catch (err) {
        return { error: err };
    }
});

cpc.send("ready");