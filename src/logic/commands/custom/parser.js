const { Parser, EOF } = require("chevrotain");
const { ALL_TOKENS, tokens: t } = require("./tokens");

// ----------------- PARSER -----------------

const $operator = { LABEL: "$op" };

const $right = { LABEL: "$right" };
const $middle = { LABEL: "$middle" };
const $left = { LABEL: "$left" };

const $list = { LABEL: "$list" };
const $elements = { LABEL: "$elements" };
const $args = { LABEL: "$arguments" };
const $props = { LABEL: "$properties" };
const $key = { LABEL: "$key" };
const $value = { LABEL: "$value" };

const $body = { LABEL: "$body" };
const $empty = { LABEL: "$empty" };

const $expression = { LABEL: "$expression" };
const $statement = { LABEL: "$statement" };

const parser = new Parser(ALL_TOKENS, {
    outputCst: true,
    ignoredIssues: {
        Statement: { OR: true },
        StatementList: { OR: true },
        AssignmentExpression: { OR: true },
        MultiExpression: { OR: true }
    }
});

const $ = parser;
$.c1 = undefined;
$.c2 = undefined;

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
    });
    $.CONSUME(t.CloseBracket);
});

// // See 11.1.4
// $.RULE("ElementList", () => {
//     $.SUBRULE($.AssignmentExpression, elements);
//     $.MANY(() => {
//         $.CONSUME(t.Comma);
//         $.SUBRULE2($.AssignmentExpression, elements);
//     });
// });

// See 11.1.5
// this inlines PropertyNameAndValueList
$.RULE("ObjectLiteral", () => {
    $.CONSUME(t.OpenCurly);
    $.OPTION(() => {
        $.SUBRULE($.PropertyDefinitionList, $list);
        $.OPTION2(() => {
            $.CONSUME2(t.Comma);
        });
    });
    $.CONSUME(t.CloseCurly);
});

$.RULE("PropertyDefinitionList", () => {
    $.SUBRULE($.PropertyDefinition, $props);
    $.MANY(() => {
        $.CONSUME(t.Comma);
        $.SUBRULE2($.PropertyDefinition, $props);
    });
});

// See 11.1.5
$.RULE("PropertyDefinition", () => {
    $.OR([
        {
            NAME: "$keyvalue",
            ALT: () => {
                $.SUBRULE($.PropertyName, $key);
                $.CONSUME(t.Colon);
                $.SUBRULE($.AssignmentExpression, $value);
            }
        },
        {
            NAME: "$method",
            ALT: () => $.SUBRULE($.MethodDefinition)
        }
    ]);
});

// See 11.1.5
// this inlines PropertySetParameterList
$.RULE("PropertyName", () => {
    $.OR([
        { ALT: () => $.CONSUME(t.IdentifierName) },
        { ALT: () => $.CONSUME(t.StringLiteral) },
        { ALT: () => $.CONSUME(t.NumbericLiteral) }
    ]);
});

$.RULE("MethodDefinition", () => {
    $.SUBRULE($.PropertyName, $key);
    $.CONSUME(t.OpenParen);
    $.SUBRULE($.FormalParameterList, $list);
    $.CONSUME(t.CloseParen);
    $.CONSUME(t.OpenCurly);
    $.SUBRULE($.FunctionBody, $body);
    $.CONSUME(t.CloseCurly);
});

// HERE MAYBE TEMPLATE LITERALS

// LEFT HAND SIDE EXPRESSIONS

$.RULE("MemberExpression", () => {
    $.SUBRULE($.PrimaryExpression, $left);
    $.MANY(() => {
        $.OR([
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
        ]);
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
                $.OR2({
                    NAME: "$unary", DEF: [
                        { ALT: () => $.CONSUME(t.OP_Plus) },
                        { ALT: () => $.CONSUME(t.OP_Minus) },
                        { ALT: () => $.CONSUME(t.Exclamation) }
                    ]
                });
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
                $.OPTION(() => {
                    $.OR2({
                        NAME: "$postfix", DEF: [
                            { ALT: () => $.CONSUME(t.Increment) },
                            { ALT: () => $.CONSUME(t.Decrement) },
                        ]
                    });
                });
            }
        },
        {
            ALT: () => {
                $.OR3({
                    NAME: "$prefix", DEF: [
                        { ALT: () => $.CONSUME2(t.Increment) },
                        { ALT: () => $.CONSUME2(t.Decrement) },
                    ]
                });
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
    $.SUBRULE($.LogicalOrExpression, { LABEL: "if" });
    $.OPTION(() => {
        $.CONSUME(t.ThenTok);
        $.SUBRULE($.AssignmentExpression, { LABEL: "then" });
        $.CONSUME(t.ElseTok);
        $.SUBRULE2($.AssignmentExpression, { LABEL: "else" });
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
    $.CONSUME(t.Semicolon);
});

$.RULE("VariableDeclaration", () => {
    $.CONSUME(t.Identifier, $key);
    $.CONSUME(t.Equal);
    $.SUBRULE($.AssignmentExpression, $key);
});

$.RULE("EmptyStatement", () => {
    //  a semicolon is never inserted automatically if the semicolon would then be parsed as an empty statement
    $.CONSUME(t.Terminator);
});

$.RULE("ExpressionStatement", () => {
    // the spec defines [lookahead ? {{, function}] to avoid some ambiguities, however those ambiguities only exist
    // because in a BNF grammar there is no priority between alternatives. This implementation however, is deterministic
    // the first alternative found to match will be taken. thus these ambiguities can be resolved
    // by ordering the alternatives
    $.SUBRULE($.Expression);
    $.CONSUME(t.Semicolon);
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
            NAME: "$for", ALT: () => {
                $.SUBRULE($.VariableDeclaration, $left);
                // no semicolon insertion in for header
                $.CONSUME(t.Semicolon);
                $.OPTION2(() => {
                    $.SUBRULE($.Expression, $middle);
                });
                // no semicolon insertion in for header
                $.CONSUME2(t.Semicolon);
                $.OPTION3(() => {
                    $.SUBRULE2($.Expression, $right);
                });
            }
        },
        {
            NAME: "$foreach", ALT: () => {
                $.CONSUME(t.Identifier, $key);
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
    $.CONSUME(t.Semicolon);
});

// See 12.8
$.RULE("BreakStatement", () => {
    $.CONSUME(t.BreakTok);
    $.CONSUME(t.Semicolon);
});

$.RULE("ReturnStatement", () => {
    $.CONSUME(t.ReturnTok);
    $.OPTION(() => {
        $.SUBRULE($.Expression, $value);
    });
    $.CONSUME(t.Semicolon);
});

$.RULE("ReplyStatement", () => {
    $.CONSUME(t.ReplyTok);
    $.OPTION(() => {
        $.SUBRULE($.Expression, $value);
    });
    $.CONSUME(t.Semicolon);
});

// FUNCTIONS (Clause 13)

$.RULE("FunctionDeclaration", () => {
    $.CONSUME(t.FuncTok);
    $.CONSUME(t.Identifier, $key);
    $.CONSUME(t.OpenParen);
    $.OPTION(() => {
        $.SUBRULE($.FormalParameterList, $list);
    });
    $.CONSUME(t.CloseParen);
    $.CONSUME(t.OpenCurly);
    $.SUBRULE($.FunctionBody, $body); // FunctionBody(clause 13) is equivalent to StatementList
    $.CONSUME(t.CloseCurly);
});

$.RULE("FunctionExpression", () => {
    $.CONSUME(t.FuncTok);
    $.OPTION1(() => {
        $.CONSUME(t.Identifier, $key);
    });
    $.CONSUME(t.OpenParen);
    $.OPTION(() => {
        $.SUBRULE($.FormalParameterList, $list);
    });
    $.CONSUME(t.CloseParen);
    $.CONSUME(t.OpenCurly);
    $.SUBRULE($.FunctionBody, $body); // FunctionBody(clause 13) is equivalent to StatementList
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
        $.SUBRULE($.StatementList, $list);
    });
});

// Start of the Program
$.RULE("Program", () => {
    $.OPTION(() => $.SUBRULE($.StatementList, $list));

    $.OPTION2(() => $.CONSUME(EOF));
});

// ----------------- SELF ANALYSIS -----------------

$.performSelfAnalysis();

module.exports = parser;