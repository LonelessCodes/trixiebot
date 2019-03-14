const NanoTimer = require("../../../modules/NanoTimer");
const lexer = require("./lexer");
const parser = require("./parser");
const interpreter = require("./interpreter");

async function parseInput(text) {
    // ----------------- TESTING -----------------

    // 1. Tokenize the input.
    const lexer_result = lexer.tokenize(text);

    for (const o of lexer_result.tokens) console.log(JSON.stringify(o.image), o.tokenType.name);
    console.log(lexer_result.errors);

    // 2. Parse the Tokens vector.
    parser.input = lexer_result.tokens;
    parser.text_input = text;
    const cst = parser.Program();

    console.log(parser.errors);

    const times = [];

    for (let i = 0; i < 1; i++) {
        const timer = new NanoTimer().begin();
        try {
            // 3. Perform semantics using a CstVisitor.
            // Note that separation of concerns between the syntactic analysis (parsing) and the semantics.
            interpreter.text_input = text;
            // interpreter.visit(cst);
            const reply = await interpreter.visit(cst);
            console.log(reply);
        } catch (error) {
            // console.log(error);
            console.log(error.toString());
        }
        const time = timer.end();
        times.push(time);
    }

    let t = 0;
    for (let e of times) t += e;
    console.log("Total: " + t / (NanoTimer.NS_PER_SEC / 1000) + " ms");
    console.log("Avg:   " + (t / times.length / (NanoTimer.NS_PER_SEC / 1000)).toFixed(6) + " ms");
}

const text = require("fs-extra").readFileSync("example.trixie", "utf8");

parseInput(text);

module.exports = parseInput;