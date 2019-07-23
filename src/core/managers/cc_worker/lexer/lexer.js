const { Lexer } = require("chevrotain");
const { ALL_TOKENS } = require("./tokens");

module.exports = new Lexer(ALL_TOKENS, {
    ensureOptimizations: true,
    errorMessageProvider: {
        buildUnexpectedCharactersMessage(fullText, startOffset, length) {
            const text = fullText.substr(startOffset, length);
            // return `->${text}<-, skipped ${length} characters`;
            return `->${text}<-`;
        },
    },
});
