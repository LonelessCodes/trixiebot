/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

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
class RuntimeError {
    /*  construct and initialize object  */
    constructor(input, message, vals, stack) {
        this.name = "RuntimeError";
        this.message = message;
        this.vals = vals;
        this.stack = stack;

        if (stack[0].pos.offset == null) return this;
        /**  render a useful string representation  */
        const excerpt = getExcerpt(input, stack[0].pos.offset);
        const prefix2 = new Array(excerpt.prologText.length).fill(" ").join("");
        const msg =
            excerpt.prologText + excerpt.tokenText + excerpt.epilogText + "\n" +
            prefix2 + "^";

        this.excerpt = msg;
    }
}

module.exports = {
    TokenizerError,
    ParserError,
    RuntimeError,
};
