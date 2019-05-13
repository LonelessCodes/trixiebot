const { Parser, EOF, tokenMatcher, tokenName, tokenLabel } = require("chevrotain");
const { ALL_TOKENS, tokens: t } = require("./lexer/tokens");

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

function hasTokenLabel(obj) {
    return typeof obj.LABEL === "string" && obj.LABEL !== "";
}

const parser = new CCParser(ALL_TOKENS, {
    outputCst: true,
    ignoredIssues: {
        Statement: { OR: true },
        StatementList: { OR: true },
        MultiExpression: { OR: true },
        ExponentiationExpression: { OR: true },
    },
    errorMessageProvider: {
        buildMismatchTokenMessage({ actual, expected }) {
            const hasLabel = hasTokenLabel(expected);
            const expectedMsg = hasLabel
                ? `--> ${tokenLabel(expected)} <--`
                : `token of type --> ${tokenName(expected)} <--`;

            return `unexpected token: Expecting ${expectedMsg}, but found ->${actual.image}<-`;
        },

        buildNotAllInputParsedMessage({ firstRedundant }) {
            // changing the template of the error message #1
            return `redundant input: expecting end of file, but found ->${firstRedundant.image}<-`;
        },

        buildNoViableAltMessage({ expectedPathsPerAlt, actual, customUserDescription, }) {
            const errPrefix = "unexpected token: ";
            const actualText = actual[0].image;
            const errSuffix = "\nbut found: ->" + actualText + "<-";

            if (customUserDescription) {
                return errPrefix + customUserDescription + errSuffix;
            } else {
                const allLookAheadPaths = expectedPathsPerAlt.reduce((result, currAltPaths) => result.concat(currAltPaths), []);
                const nextValidTokenSequences = allLookAheadPaths.slice(0, 10).map(
                    currPath =>
                        `[${currPath.map(currTokenType =>
                            tokenLabel(currTokenType)
                        ).join(", ")}]`
                );
                const notRenderedSequences = allLookAheadPaths.length - nextValidTokenSequences.length;
                const nextValidSequenceItems = nextValidTokenSequences.map((itemMsg, idx) => `  ${idx + 1}. ${itemMsg}`);
                if (notRenderedSequences > 0) nextValidSequenceItems.push(`    and ${notRenderedSequences} more...`);
                const calculatedDescription =
                    `expecting one of these possible token sequences:\n${nextValidSequenceItems.join("\n")}`;

                return errPrefix + calculatedDescription + errSuffix;
            }
        },

        buildEarlyExitMessage({ actual, customUserDescription, expectedIterationPaths }) {
            const errPrefix = "unexpected token: ";
            const actualText = actual[0].image;
            const errSuffix = "\nbut found: ->" + actualText + "<-";

            if (customUserDescription) {
                return errPrefix + customUserDescription + errSuffix;
            } else {
                const nextValidTokenSequences = expectedIterationPaths.slice(0, 10).map(
                    currPath => `[${currPath.map(
                        currTokenType => tokenLabel(currTokenType)
                    ).join(", ")}]`
                );
                const notRenderedSequences = expectedIterationPaths.length - nextValidTokenSequences.length;
                if (notRenderedSequences > 0) nextValidTokenSequences.push(`[and ${notRenderedSequences} more...]`);
                const calculatedDescription =
                    `expecting at least one of these possible token sequences:\n  <${nextValidTokenSequences.join(", ")}>`;

                return errPrefix + calculatedDescription + errSuffix;
            } 
        }
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
    $.SUBRULE($.AssignmentExpression, $body);
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
                        $.SUBRULE($.AssignmentExpression, $key);
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

$.RULE("UpdateExpression", () => {
    $.OR([
        {
            ALT: () => {
                $.SUBRULE($.MemberExpression, $left);
                $.OPTION(() => {
                    $.OR2([
                        { ALT: () => $.CONSUME(t.Increment, { LABEL: "$postfix" }) },
                        { ALT: () => $.CONSUME(t.Decrement, { LABEL: "$postfix" }) },
                    ]);
                });
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

$.RULE("ExponentiationExpression", () => {
    $.OR([
        { ALT: () => $.SUBRULE($.UnaryExpression, $left) },
        {
            ALT: () => {
                $.SUBRULE($.UpdateExpression, $left);
                $.CONSUME(t.OP_Exponent, $operator);
                $.SUBRULE($.ExponentiationExpression, $right);
            }
        }
    ]);
});

$.RULE("MultiExpression", () => {
    $.SUBRULE1($.ExponentiationExpression, $left);
    $.MANY(() => {
        $.CONSUME(t.MultiOperator, $operator);
        $.SUBRULE2($.ExponentiationExpression, $right);
    });
});

$.RULE("AdditiveExpression", () => {
    $.SUBRULE1($.MultiExpression, $left);
    $.MANY(() => {
        $.CONSUME(t.AdditiveOperator, $operator);
        $.SUBRULE2($.MultiExpression, $right);
    });
});

$.RULE("RelationalExpression", () => {
    $.SUBRULE1($.AdditiveExpression, $left);
    $.MANY(() => {
        $.CONSUME(t.RelationOperator, $operator);
        $.SUBRULE2($.AdditiveExpression, $right);
    });
});

$.RULE("EqualityExpression", () => {
    $.SUBRULE1($.RelationalExpression, $left);
    $.MANY(() => {
        $.CONSUME(t.EqualityOperator, $operator);
        $.SUBRULE2($.RelationalExpression, $right);
    });
});

$.RULE("LogicalAndExpression", () => {
    $.SUBRULE1($.EqualityExpression, $left);
    $.MANY(() => {
        $.CONSUME(t.AndTok, $operator);
        $.SUBRULE2($.EqualityExpression, $right);
    });
});

$.RULE("LogicalOrExpression", () => {
    $.SUBRULE1($.LogicalAndExpression, $left);
    $.MANY(() => {
        $.CONSUME(t.OrTok, $operator);
        $.SUBRULE2($.LogicalAndExpression, $right);
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

$.RULE("Statement", () => {
    $.OR(
        $.c2 ||
        ($.c2 = [
            { ALT: () => $.SUBRULE($.BlockStatement, $statement) },
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
    $.SUBRULE($.AssignmentExpression);
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

$.RULE("IfStatement", () => {
    $.CONSUME(t.IfTok);
    $.CONSUME(t.OpenParen);
    $.SUBRULE($.AssignmentExpression, $expression);
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
    $.SUBRULE($.AssignmentExpression, $expression);
    $.CONSUME(t.CloseParen);
    $.SUBRULE($.Statement, $body);
});

$.RULE("ForIterationStatement", () => {
    $.CONSUME(t.ForTok);
    $.CONSUME(t.OpenParen);
    $.OR([
        {
            ALT: () => {
                $.SUBRULE($.VariableDeclaration, $left);
                // no semicolon insertion in for header
                $.CONSUME(t.Semicolon, $disableSemicolonInsertion);
                $.OPTION2(() => {
                    $.SUBRULE($.AssignmentExpression, $middle);
                });
                // no semicolon insertion in for header
                $.CONSUME2(t.Semicolon, $disableSemicolonInsertion);
                $.OPTION3(() => {
                    $.SUBRULE2($.AssignmentExpression, $right);
                });
            }
        },
        {
            ALT: () => {
                $.CONSUME(t.Identifier);
                $.CONSUME(t.OfTok);
                // maybe use PrimaryExpression
                $.SUBRULE3($.AssignmentExpression, $value);
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
        $.SUBRULE($.AssignmentExpression, $value);
    });
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

$.RULE("SleepStatement", () => {
    $.CONSUME(t.SleepTok);
    $.OPTION(() => {
        $.SUBRULE($.AssignmentExpression, $value);
    });
    $.CONSUME(t.Semicolon, $enableSemicolonInsertion);
});

$.RULE("ReplyStatement", () => {
    $.CONSUME(t.ReplyTok);
    $.OPTION(() => {
        $.SUBRULE($.AssignmentExpression, $value);
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