const { Parser, EOF, tokenMatcher } = require("chevrotain");
const { ALL_TOKENS, tokens: t } = require("./tokens");

// ----------------- PARSER -----------------

const $operator = { LABEL: "$op" };

const $right = { LABEL: "$right" };
const $middle = { LABEL: "$middle" };
const $left = { LABEL: "$left" };

const $list = { LABEL: "$list" };
const $elements = { LABEL: "$elements" };
const $args = { LABEL: "$args" };
const $key = { LABEL: "$key" };
const $value = { LABEL: "$value" };

const $body = { LABEL: "$body" };
const $empty = { LABEL: "$empty" };

const $expression = { LABEL: "$expression" };
const $statement = { LABEL: "$statement" };

const $enableSemicolonInsertion = { trySemiColonInsertion: true };
const $disableSemicolonInsertion = { trySemiColonInsertion: false };

const insertedSemiColon = {
    tokenTypeIdx: t.Semicolon.tokenTypeIdx,
    image: ";",
    startOffset: NaN,
    endOffset: NaN,
    automaticallyInserted: true
};

class CCParser extends Parser {
    constructor(tokens, opts) {
        super(tokens, opts);

        // Optimization to avoid traversing the prototype chain at hotspots.
        this.SUPER_CONSUME = super.CONSUME;
        this.SUPER_CONSUME2 = super.CONSUME2;

        this.text_input = undefined;

        this.c1 = undefined;
        this.c2 = undefined;
    }

    CONSUME(tokClass, opts = {}) {
        opts = { trySemiColonInsertion: false, ...opts };

        if (opts.trySemiColonInsertion && this.canAndShouldDoSemiColonInsertion()) {
            return insertedSemiColon;
        }
        return this.SUPER_CONSUME(tokClass, opts);
    }

    CONSUME2(tokClass, opts = {}) {
        opts = { trySemiColonInsertion: false, ...opts };

        if (opts.trySemiColonInsertion && this.canAndShouldDoSemiColonInsertion()) {
            return insertedSemiColon;
        }
        return this.SUPER_CONSUME2(tokClass, opts);
    }

    /*
     * Link https://www.ecma-international.org/ecma-262/5.1/#sec-7.9.1
     * Automatic semicolon insertion implementation.
     * The spec defines the insertion in terms of encountering an "offending"
     * token and then inserting a semicolon under one of three basic rules.
     * 1. Offending token is after a lineTerminator.
     * 2. Offending token is a '}' RCurly.
     * 3. Reached EOF but failed to parse a complete ECMAScript Program.
     *
     * In addition there are two overriding conditions on these rules.
     * 1. do not insert if the semicolon would then be parsed as an empty statement.
     * 2. do not If that semicolon would become one of the two semicolons in the header of a for statement.
     *
     * The implementation approaches this problem in a slightly different but equivalent approach:
     *
     * anytime a semicolon should be consumed AND
     * the nextToken is not a semicolon AND
     * the context is one that allows semicolon insertion (not in a for header or empty Statement) AND
     * one of the 3 basic rules match
     * ---------------------------------->
     * THEN insert a semicolon
     *
     * Note that the context information is passed as the 'trySemiColonInsertion' argument
     * to the CONSUME parsing DSL method
     */
    canAndShouldDoSemiColonInsertion() {
        const nextToken = this.LA(1);
        const isNextTokenSemiColon = tokenMatcher(nextToken, t.Semicolon);
        return (
            isNextTokenSemiColon === false &&
            (this.lineTerminatorHere() || // basic rule 1a and 3
                tokenMatcher(nextToken, t.CloseCurly) || // basic rule 1b
                tokenMatcher(nextToken, EOF))
        ); // basic rule 2
    }

    noLineTerminatorHere() {
        return !this.lineTerminatorHere();
    }

    lineTerminatorHere() {
        const prevToken = this.LA(0);
        const nextToken = this.LA(1);
        const seekStart = prevToken.endOffset;
        const seekEnd = nextToken.startOffset - 1;

        let i = seekStart;
        while (i < seekEnd) {
            const code = this.text_input.charCodeAt(i);
            if (
                code === 10 ||
                code === 13 ||
                code === 0x2028 ||
                code === 0x2029
            ) {
                return true;
            }
            i++;
        }
        return false;
    }
}

const parser = new CCParser(ALL_TOKENS, {
    outputCst: true,
    ignoredIssues: {
        Statement: { OR: true },
        StatementList: { OR: true },
        MultiExpression: { OR: true }
    }
});

const $ = parser;

// PRIMARY EXPRESSION

$.RULE("PrimaryExpression", () => {
    $.OR(
        $.c1 || ($.c1 = [
            { ALT: () => $.CONSUME(t.Identifier) },
            { ALT: () => $.CONSUME(t.Literal) },
            { ALT: () => $.SUBRULE($.ArrayLiteral) },
            { ALT: () => $.SUBRULE($.ObjectLiteral) },
            { ALT: () => $.SUBRULE($.FunctionExpression) },
            { ALT: () => $.SUBRULE($.ParenExpression) }
        ])
    );
});

$.RULE("ParenExpression", () => {
    $.CONSUME(t.OpenParen);
    $.SUBRULE($.Expression, $body);
    $.CONSUME(t.CloseParen);
});

// See 11.1.4
$.RULE("ArrayLiteral", () => {
    $.CONSUME(t.OpenBracket);
    $.OPTION(() => {
        // ElementList
        $.SUBRULE($.AssignmentExpression, $elements);
        $.MANY(() => {
            $.CONSUME(t.Comma);
            $.SUBRULE2($.AssignmentExpression, $elements);
        });
        $.OPTION2(() => {
            $.CONSUME2(t.Comma);
        });
    });
    $.CONSUME(t.CloseBracket);
});

// See 11.1.5
// this inlines PropertyNameAndValueList
$.RULE("ObjectLiteral", () => {
    $.CONSUME(t.OpenCurly);
    $.OPTION(() => {
        $.SUBRULE($.PropertyDefinitionList);
        $.OPTION2(() => {
            $.CONSUME2(t.Comma);
        });
    });
    $.CONSUME(t.CloseCurly);
});

$.RULE("PropertyDefinitionList", () => {
    $.SUBRULE($.PropertyDefinition);
    $.MANY(() => {
        $.CONSUME(t.Comma);
        $.SUBRULE2($.PropertyDefinition);
    });
});

// See 11.1.5
$.RULE("PropertyDefinition", () => {
    $.OR([
        {
            ALT: () => {
                $.SUBRULE($.PropertyName);
                $.CONSUME(t.Colon);
                $.SUBRULE($.AssignmentExpression, $value);
            }
        },
        {
            ALT: () => $.SUBRULE($.MethodDefinition)
        }
    ]);
});

// See 11.1.5
// this inlines PropertySetParameterList
$.RULE("PropertyName", () => {
    $.OR([
        { ALT: () => $.CONSUME(t.IdentifierName) },
        { ALT: () => $.CONSUME(t.StringLiteral) }
    ]);
});

$.RULE("MethodDefinition", () => {
    $.SUBRULE($.PropertyName);
    $.CONSUME(t.OpenParen);
    $.OPTION(() => {
        $.SUBRULE($.FormalParameterList);
    });
    $.CONSUME(t.CloseParen);
    $.CONSUME(t.OpenCurly);
    $.SUBRULE($.FunctionBody);
    $.CONSUME(t.CloseCurly);
});

// HERE MAYBE TEMPLATE LITERALS

// LEFT HAND SIDE EXPRESSIONS

$.RULE("MemberExpression", () => {
    $.SUBRULE($.PrimaryExpression, $left);
    $.MANY(() => {
        $.OR({
            NAME: "$member", DEF: [
                {
                    NAME: "$square", ALT: () => {
                        $.CONSUME(t.OpenBracket);
                        $.SUBRULE($.Expression, $key);
                        $.CONSUME(t.CloseBracket);
                    }
                },
                {
                    NAME: "$dot", ALT: () => {
                        $.CONSUME(t.Dot);
                        $.CONSUME(t.IdentifierName, $key);
                    }
                },
                {
                    NAME: "$call", ALT: () => {
                        $.SUBRULE($.Arguments);
                    }
                }
            ]
        });
    });
});

$.RULE("Arguments", () => {
    $.CONSUME(t.OpenParen);
    $.OPTION(() => {
        $.SUBRULE($.AssignmentExpression, $args);
        $.MANY(() => {
            $.CONSUME(t.Comma);
            $.SUBRULE2($.AssignmentExpression, $args);
        });
    });
    $.CONSUME(t.CloseParen);
});

$.RULE("UnaryExpression", () => {
    $.OR([
        { ALT: () => $.SUBRULE($.UpdateExpression, $left) },
        {
            ALT: () => {
                $.OR2([
                    { ALT: () => $.CONSUME(t.OP_Plus, { LABEL: "$unary" }) },
                    { ALT: () => $.CONSUME(t.OP_Minus, { LABEL: "$unary" }) },
                    { ALT: () => $.CONSUME(t.Exclamation, { LABEL: "$unary" }) }
                ]);
                $.SUBRULE($.UnaryExpression, $left);
            }
        }
    ]);
});

$.RULE("UpdateExpression", () => {
    $.OR([
        {
            ALT: () => {
                $.SUBRULE($.MemberExpression, $left);
                // $.OPTION(() => {
                //     $.OR2({
                //         { ALT: () => $.CONSUME(t.Increment, { LABEL: "$postfix" }) },
                //         { ALT: () => $.CONSUME(t.Decrement, { LABEL: "$postfix" }) },
                //     ]);
                // });
            }
        },
        {
            ALT: () => {
                $.OR3([
                    { ALT: () => $.CONSUME2(t.Increment, { LABEL: "$prefix" }) },
                    { ALT: () => $.CONSUME2(t.Decrement, { LABEL: "$prefix" }) },
                ]);
                $.SUBRULE($.UnaryExpression, $right);
            }
        }
    ]);
});

$.RULE("MultiExpression", () => {
    $.OR([
        { ALT: () => $.SUBRULE($.UnaryExpression, $left) },
        {
            ALT: () => {
                $.SUBRULE($.UpdateExpression, $left);
                $.CONSUME(t.MultiOperator, $operator);
                $.SUBRULE($.MultiExpression, $right);
            }
        }
    ]);
});

$.RULE("AdditiveExpression", () => {
    $.SUBRULE($.MultiExpression, $left);
    $.OPTION(() => {
        $.CONSUME(t.AdditiveOperator, $operator);
        $.SUBRULE($.AdditiveExpression, $right);
    });
});

$.RULE("RelationalExpression", () => {
    $.SUBRULE($.AdditiveExpression, $left);
    $.OPTION(() => {
        $.CONSUME(t.RelationOperator, $operator);
        $.SUBRULE($.RelationalExpression, $right);
    });
});

$.RULE("EqualityExpression", () => {
    $.SUBRULE($.RelationalExpression, $left);
    $.OPTION(() => {
        $.CONSUME(t.EqualityOperator, $operator);
        $.SUBRULE($.EqualityExpression, $right);
    });
});

$.RULE("LogicalAndExpression", () => {
    $.SUBRULE($.EqualityExpression, $left);
    $.OPTION(() => {
        $.CONSUME(t.AndTok, $operator);
        $.SUBRULE($.LogicalAndExpression, $right);
    });
});

$.RULE("LogicalOrExpression", () => {
    $.SUBRULE($.LogicalAndExpression, $left);
    $.OPTION(() => {
        $.CONSUME(t.OrTok, $operator);
        $.SUBRULE2($.LogicalOrExpression, $right);
    });
});

$.RULE("ConditionalExpression", () => {
    $.SUBRULE($.LogicalOrExpression, { LABEL: "$if" });
    $.OPTION(() => {
        $.CONSUME(t.ThenTok);
        $.SUBRULE($.AssignmentExpression, { LABEL: "$then" });
        $.CONSUME(t.ElseTok);
        $.SUBRULE2($.AssignmentExpression, { LABEL: "$else" });
    });
});

$.RULE("AssignmentExpression", () => {
    $.SUBRULE($.ConditionalExpression, $left);
    $.OPTION(() => {
        $.CONSUME(t.AssignOperator, $operator);
        $.SUBRULE($.AssignmentExpression, $right);
    });
});

$.RULE("Expression", () => {
    $.SUBRULE($.AssignmentExpression, $expression);
    $.MANY(() => {
        $.CONSUME(Comma);
        $.SUBRULE2($.AssignmentExpression, $expression);
    });
});

$.RULE("Statement", () => {
    $.OR(
        $.c2 ||
        ($.c2 = [
            { ALT: () => $.SUBRULE($.BlockStatement, $statement) },
            // { ALT: () => $.SUBRULE($.VariableStatement, statement) },
            { ALT: () => $.SUBRULE($.EmptyStatement, $empty) },
            { ALT: () => $.SUBRULE($.ExpressionStatement, $statement) },
            { ALT: () => $.SUBRULE($.IfStatement, $statement) },
            { ALT: () => $.SUBRULE($.WhileIterationStatement, $statement) },
            { ALT: () => $.SUBRULE($.ForIterationStatement, $statement) },
            { ALT: () => $.SUBRULE($.ContinueStatement, $statement) },
            { ALT: () => $.SUBRULE($.BreakStatement, $statement) },
            { ALT: () => $.SUBRULE($.ReturnStatement, $statement) },
            { ALT: () => $.SUBRULE($.SleepStatement, $statement) },
            { ALT: () => $.SUBRULE($.ReplyStatement, $statement) },
        ])
    );
});

$.RULE("BlockStatement", () => {
    $.CONSUME(t.OpenCurly);
    $.OPTION(() => {
        $.SUBRULE($.StatementList, $list);
    });
    $.CONSUME(t.CloseCurly);
});

// See 12.1
$.RULE("StatementList", () => {
    $.AT_LEAST_ONE(() => {
        $.OR([
            { ALT: () => $.SUBRULE($.FunctionDeclaration, $statement) },
            { ALT: () => $.SUBRULE($.Statement, $statement) },
        ]);
    });
});

$.RULE("VariableStatement", () => {
    // $.CONSUME(t.VarTok);
    $.SUBRULE($.VariableDeclaration);
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

$.RULE("VariableDeclaration", () => {
    $.CONSUME(t.Identifier);
    $.CONSUME(t.Equal);
    $.SUBRULE($.AssignmentExpression, $value);
});

$.RULE("EmptyStatement", () => {
    //  a semicolon is never inserted automatically if the semicolon would then be parsed as an empty statement
    $.CONSUME(t.Semicolon, $disableSemicolonInsertion);
});

$.RULE("ExpressionStatement", () => {
    // the spec defines [lookahead ? {{, function}] to avoid some ambiguities, however those ambiguities only exist
    // because in a BNF grammar there is no priority between alternatives. This implementation however, is deterministic
    // the first alternative found to match will be taken. thus these ambiguities can be resolved
    // by ordering the alternatives
    $.SUBRULE($.Expression);
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

$.RULE("IfStatement", () => {
    $.CONSUME(t.IfTok);
    $.CONSUME(t.OpenParen);
    $.SUBRULE($.Expression, $expression);
    $.CONSUME(t.CloseParen);
    $.SUBRULE($.Statement, { LABEL: "$then" });
    // refactoring spec to use an OPTION production for the 'else'
    // to resolve the dangling if-else problem
    $.OPTION(() => {
        $.CONSUME(t.ElseTok);
        $.SUBRULE2($.Statement, { LABEL: "$else" });
    });
});

$.RULE("WhileIterationStatement", () => {
    $.CONSUME(t.WhileTok);
    $.CONSUME(t.OpenParen);
    $.SUBRULE($.Expression, $expression);
    $.CONSUME(t.CloseParen);
    $.SUBRULE($.Statement, $body);
});

$.RULE("ForIterationStatement", () => {
    $.CONSUME(t.ForTok);
    $.CONSUME(t.OpenParen);
    // $.OPTION(() => {
    //     $.CONSUME(t.VarTok);
    // });
    $.OR([
        {
            ALT: () => {
                $.SUBRULE($.VariableDeclaration, $left);
                // no semicolon insertion in for header
                $.CONSUME(t.Semicolon, $disableSemicolonInsertion);
                $.OPTION2(() => {
                    $.SUBRULE($.Expression, $middle);
                });
                // no semicolon insertion in for header
                $.CONSUME2(t.Semicolon, $disableSemicolonInsertion);
                $.OPTION3(() => {
                    $.SUBRULE2($.Expression, $right);
                });
            }
        },
        {
            ALT: () => {
                $.CONSUME(t.Identifier);
                $.CONSUME(t.OfTok);
                // maybe use PrimaryExpression
                $.SUBRULE3($.Expression, $value);
            }
        }
    ]);
    $.CONSUME(t.CloseParen);
    $.SUBRULE($.Statement, $body);
});

$.RULE("ContinueStatement", () => {
    $.CONSUME(t.ContinueTok);
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

// See 12.8
$.RULE("BreakStatement", () => {
    $.CONSUME(t.BreakTok);
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

$.RULE("ReturnStatement", () => {
    $.CONSUME(t.ReturnTok);
    $.OPTION(() => {
        $.SUBRULE($.Expression, $value);
    });
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

$.RULE("SleepStatement", () => {
    $.CONSUME(t.SleepTok);
    $.OPTION(() => {
        $.SUBRULE($.Expression, $value);
    });
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

$.RULE("ReplyStatement", () => {
    $.CONSUME(t.ReplyTok);
    $.OPTION(() => {
        $.SUBRULE($.Expression, $value);
    });
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

// FUNCTIONS (Clause 13)

$.RULE("FunctionDeclaration", () => {
    $.CONSUME(t.FuncTok);
    $.CONSUME(t.Identifier);
    $.CONSUME(t.OpenParen);
    $.OPTION(() => {
        $.SUBRULE($.FormalParameterList);
    });
    $.CONSUME(t.CloseParen);
    $.CONSUME(t.OpenCurly);
    $.SUBRULE($.FunctionBody); // FunctionBody(clause 13) is equivalent to StatementList
    $.CONSUME(t.CloseCurly);
});

$.RULE("FunctionExpression", () => {
    $.CONSUME(t.FuncTok);
    $.CONSUME(t.OpenParen);
    $.OPTION(() => {
        $.SUBRULE($.FormalParameterList);
    });
    $.CONSUME(t.CloseParen);
    $.CONSUME(t.OpenCurly);
    $.SUBRULE($.FunctionBody); // FunctionBody(clause 13) is equivalent to StatementList
    $.CONSUME(t.CloseCurly);
});

// See clause 13
$.RULE("FormalParameterList", () => {
    $.CONSUME(t.Identifier, $args);
    $.MANY(() => {
        $.CONSUME(t.Comma);
        $.CONSUME2(t.Identifier, $args);
    });
});

$.RULE("FunctionBody", () => {
    $.OPTION(() => {
        $.SUBRULE($.StatementList);
    });
});

// Start of the Program
$.RULE("Program", () => {
    $.OPTION(() => $.SUBRULE($.StatementList));

    $.OPTION2(() => $.CONSUME(EOF));
});

// ----------------- SELF ANALYSIS -----------------

$.performSelfAnalysis();

module.exports = parser;