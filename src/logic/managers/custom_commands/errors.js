const { getExcerpt } = require("./util");

/**
 * SYNTAX ERRORS
 */

class SyntaxError {
    constructor() {
        this.startLineNumber = 1;
        this.startColumn = 1;
        this.endLineNumber = 1;
        this.endColumn = 1;
        this.message = "Syntax Error";
    }
}

class TokenizerError extends SyntaxError {
    constructor(err) {
        super();

        this.startLineNumber = err.line;
        this.endLineNumber = err.line;
        this.startColumn = err.column;
        this.endColumn = err.column + err.length;
        this.message = "unexpected character: " + err.message;
    }
}

class ParserError extends SyntaxError {
    constructor({ message, token = {}, previousToken = {} }) {
        super();

        this.message = message;
        this.startLineNumber = token.startLine || previousToken.startLine || 1;
        this.endLineNumber = token.endLine || token.startLine || previousToken.endLine || 1;
        this.startColumn = token.startColumn || previousToken.startColumn || 1;
        this.endColumn = (token.endColumn || token.startColumn || previousToken.endColumn || 0) + 1;
    }
}

/**
 * RUNTIME ERRORS
 */

/**  internal helper class for tokenization error reporting  */
class RuntimeError extends Error {
    /*  construct and initialize object  */
    constructor(message, offset, line, column, input) {
        super(message);
        this.name = "RuntimeError";
        this.message = message;
        this.offset = offset;
        this.line = line;
        this.column = column;
        this.input = input;
    }

    /**  render a useful string representation  */
    toString() {
        const excerpt = getExcerpt(this.input, this.offset);
        const prefix1 = `line ${this.line} (column ${this.column}): `;
        const prefix2 = new Array(prefix1.length + excerpt.prologText.length).fill(" ").join("");
        let msg = "Runtime Error: " + this.message + "\n" +
            prefix1 + excerpt.prologText + excerpt.tokenText + excerpt.epilogText + "\n" +
            prefix2 + "^";
        return msg;
    }
}

module.exports = {
    TokenizerError,
    ParserError,
    RuntimeError,
};