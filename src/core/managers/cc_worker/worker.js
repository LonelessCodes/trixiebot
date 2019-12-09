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

const cpc = require("trixie-ipc/cpc")(process);

const lexer = require("./lexer/lexer");
const parser = require("./parser");
const Interpreter = require("./interpreter/Interpreter");
const { ObjectLiteral } = require("./interpreter/types");
const { ParserError, TokenizerError, RuntimeError } = require("./errors");
const { log } = require("./util");

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

async function runCC(commandId, code, cst, message, settings) {
    const interpreter = new Interpreter(commandId, message.guild.id, code, settings);

    try {
        // 3. Perform semantics using a CstVisitor.
        // Note that separation of concerns between the syntactic analysis (parsing) and the semantics.
        const reply = await interpreter.visit(cst, message);
        if (reply instanceof ObjectLiteral && reply.isEmbed) {
            return { embed: reply.getEmbed() };
        }
        return { content: reply ? reply.native : null };
    } catch (error) {
        if (!(error instanceof RuntimeError)) log.error(error);
        return { error };
    }
}

cpc.answer("lint", ({ code }) => {
    try {
        compileCC(code);
        return { errors: [] };
    } catch (errs) {
        return { errors: errs };
    }
});

cpc.answer("compile", payload => {
    const { code } = payload;

    try {
        return { cst: compileCC(code), errors: [] };
    } catch (errs) {
        return { cst: undefined, errors: errs };
    }
});

cpc.answer("run", ({ id, code, cst, message, settings }) => runCC(id, code, cst, message, settings));

cpc.send("ready");
