const { Lexer } = require("chevrotain");
const { ALL_TOKENS } = require("./tokens");

module.exports = new Lexer(ALL_TOKENS, { ensureOptimizations: true });