const lexer = require("./lexer");
const parser = require("./parser");

function parseInput(text) {
    // ----------------- TESTING -----------------

    const lexer_result = lexer.tokenize(text);

    for (const o of lexer_result.tokens) console.log(JSON.stringify(o.image), o.tokenType.name);
    console.log(lexer_result.errors);

    parser.input = lexer_result.tokens;

    const cst = parser.Program();

    console.log(cst);
    console.log(parser.errors);

    require("fs-extra").writeFileSync("cst.json", JSON.stringify(cst, null, 2));
}

const text = `
func cuddle(user) {
    reply "*cuddles " + user + " tightly* <3<3<3";
}
if ($mentions.members.size > 0) {
    cuddle($mentions.users.first());
} else {
    cuddle($author);
}
`;

parseInput(text);

module.exports = parseInput;