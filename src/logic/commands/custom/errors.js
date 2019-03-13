const { getExcerpt } = require("./util");

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

/**  internal helper class for tokenization error reporting  */
class ParsingError extends Error {
    /*  construct and initialize object  */
    constructor(message, pos, line, column, input) {
        super(message);
        this.name = "ParsingError";
        this.message = message;
        this.pos = pos;
        this.line = line;
        this.column = column;
        this.input = input;
    }

    /**  render a useful string representation  */
    toString() {
        const excerpt = getExcerpt(this.input, this.pos);
        const prefix1 = `line ${this.line} (column ${this.column}): `;
        const prefix2 = new Array(prefix1.length + excerpt.prologText.length).fill(" ").join("");
        let msg = "Parsing Error: " + this.message + "\n" +
            prefix1 + excerpt.prologText + excerpt.tokenText + excerpt.epilogText + "\n" +
            prefix2 + "^";
        return msg;
    }
}

module.exports = {
    RuntimeError,
    ParsingError
};