const { tokens: { WhiteSpace, LineTerminator, MultiLineComment, SingleLineComment } } = require("../tokens");
const parser = require("../parser");
const { RuntimeError } = require("../errors");
const {
    toBool,
    assign,
    isReturn,
    isBreak,
    createStringLiteral,
    Item,
    NullLiteral,
    BooleanLiteral,
    NumberLiteral,
    StringLiteral,
    ArrayLiteral,
    ObjectLiteral,
    Func,
    NativeFunc,
    ContinueInterrupt,
    BreakInterrupt,
    ReturnInterrupt,
    ReplyInterrupt,
    Variable,
    VariableStack,
    StatementStack,
    StatementManager,
    Member,
} = require("./classes");

const GLOBALS = require("./globals");

// ----------------- Interpreter -----------------
// Obtains the default CstVisitor constructor to extend.
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

// All our semantics go into the visitor, completly separated from the grammar.
class CCInterpreter extends BaseCstVisitor {
    constructor() {
        super();
        // This helper will detect any missing or redundant methods on this visitor
        this.validateVisitor();

        /** @type {string} */
        this.text_input = null;

        /** @type {(msg: string, item: { startOffset: number, startLine: number, startColumn: number}) => RuntimeError} */
        this.error = (msg, item) => {
            if (item) {
                if (item instanceof Array) item = item[0];
                while (!!item.children) item = item.children[Object.getOwnPropertyNames(item.children)[0]][0];
                return new RuntimeError(msg, item.startOffset, item.startLine, item.startColumn, this.text_input);
            }
            return new RuntimeError(msg);
        };

        this.varsPerStatement = new VariableStack;

        this.statementStack = new StatementManager;

        this.cleanup = () => {
            this.text_input = null;
            this.varsPerStatement.clear();
            this.statementStack.clear();
        };
    }

    PrimaryExpression(ctx) {
        if (ctx.Identifier) {
            const identifier = ctx.Identifier[0];
            const name = identifier.image;
            const variable = this.varsPerStatement.getVariable(name, this);

            if (variable) return variable;

            if (GLOBALS[name])  return GLOBALS[name];

            let input = this.text_input.substr(identifier.endOffset + 1);

            const regexp = token => {
                /** @type {RegExp} */
                const r = token.PATTERN;
                return r;
            };

            // is ugly, ye, but how else should i do it??
            // checking if the next token is =, if it is, then its an assignment or declaration
            // if it is not =, means should throw a "not declared" error

            let nextToken = "";
            let exec;
            while (nextToken === "") {
                if ((exec = regexp(WhiteSpace).exec(input)) && exec.index === 0) {
                    input = input.substr(exec[0].length);
                    continue;
                }
                if ((exec = regexp(LineTerminator).exec(input)) && exec.index === 0) {
                    input = input.substr(exec[0].length);
                    continue;
                }
                if ((exec = regexp(SingleLineComment).exec(input)) && exec.index === 0) {
                    input = input.substr(exec[0].length);
                    continue;
                }
                if ((exec = regexp(MultiLineComment).exec(input)) && exec.index === 0) {
                    input = input.substr(exec[0].length);
                    continue;
                }
                if (input.length > 0)
                    nextToken = input.charAt(0);
                else nextToken = "EOF";
                break;
            }

            if (!input.startsWith("==") && input.startsWith("=")) {
                return this.varsPerStatement.createVariable(name, ctx, this);
            }

            throw this.error("Variable '" + name + "' not declared yet", identifier);
        } else if (ctx.Literal) {
            const Literal = ctx.Literal[0];
            const image = Literal.image;
            switch (Literal.tokenType.tokenName) {
                case "NullTok":
                    return new NullLiteral();
                case "TrueTok":
                    return new BooleanLiteral(true);
                case "FalseTok":
                    return new BooleanLiteral(false);
                case "DecimalLiteral":
                    const [num, exp] = image.split(/e/i);
                    return new NumberLiteral(parseFloat(num) * (exp ? Math.pow(10, parseInt(exp)) : 1));
                case "HexLiteral":
                    return new NumberLiteral(parseInt(image.substr(2), 16));
                case "OctalLiteral":
                    return new NumberLiteral(parseInt(image.substr(2), 8));
                case "BinaryLiteral":
                    return new NumberLiteral(parseInt(image.substr(2), 2));
                case "StringLiteral":
                    return createStringLiteral(image, this);
            }
        } else if (ctx.ArrayLiteral) {
            return this.visit(ctx.ArrayLiteral);
        } else if (ctx.ObjectLiteral) {
            return this.visit(ctx.ObjectLiteral);
        } else if (ctx.FunctionExpression) {
            return this.visit(ctx.FunctionExpression);
        } else if (ctx.ParenExpression) {
            return this.visit(ctx.ParenExpression);
        }
    }

    ParenExpression(ctx) {
        return this.visit(ctx.$body);
    }

    ArrayLiteral(ctx) {
        const arr = [];
        if (ctx.$elements) {
            for (const elem of ctx.$elements) {
                arr.push(assign(this.visit(elem)));
            }
        }
        return new ArrayLiteral(arr);
    }

    ObjectLiteral(ctx) {
        const obj = {};
        const list = this.visit(ctx.PropertyDefinitionList);
        for (const [key, value] of list) {
            obj[key] = value;
        }
        return new ObjectLiteral(obj);
    }

    PropertyDefinitionList(ctx) {
        const list = [];
        for (const elem of ctx.PropertyDefinition) {
            list.push(this.visit(elem));
        }
        return list;
    }

    PropertyDefinition(ctx) {
        if (ctx.PropertyName) {
            const key = this.visit(ctx.PropertyName);
            const value = assign(this.visit(ctx.$value));
            return [key, value];
        } else if (ctx.MethodDefinition) {
            return this.visit(ctx.MethodDefinition);
        }
    }

    PropertyName(ctx) {
        if (ctx.IdentifierName) {
            return ctx.IdentifierName[0].image;
        } else if (ctx.StringLiteral) {
            return createStringLiteral(ctx.StringLiteral[0].image, this).content;
        }
    }

    MethodDefinition(ctx) {
        this.statementStack.push(ctx);

        const name = this.visit(ctx.PropertyName);
        const args = ctx.FormalParameterList ? this.visit(ctx.FormalParameterList) : [];
        const func = new Func(name, args, this.statementStack.clone(), ctx.FunctionBody[0]);

        this.statementStack.pop();

        return [name, func];
    }

    MemberExpression(ctx) {
        if (!ctx.$member) return this.visit(ctx.$left);

        /** @type {Item} */
        let val = assign(this.visit(ctx.$left));
        for (let i = 0; i < ctx.$member.length; i++) {
            val = this.visit(ctx.$member[i], { val });
        }
        return val;
    }

    MemberExpression$member(ctx, { val }) {
        if (ctx.$square) {
            val = this.visit(ctx.$square, { val });
        } else if (ctx.$dot) {
            val = this.visit(ctx.$dot, { val });
        } else if (ctx.$call) {
            val = this.visit(ctx.$call, { val });
        }
        return val;
    }

    MemberExpression$square(ctx, { val }) {
        const key = assign(this.visit(ctx.$key));
        if (val instanceof NullLiteral) {
            const name = key.getProp(new StringLiteral("toString")).call(this, key);
            throw this.error("Cannot read property '" + name ? name.content : "[no toString func]" + "' of null", ctx.$key);
        } else {
            val = new Member(val, key, val.getProp(key));
        }
        return val;
    }

    MemberExpression$dot(ctx, { val }) {
        const key = new StringLiteral(ctx.$key[0].image);
        if (val instanceof NullLiteral) {
            const name = key.getProp(new StringLiteral("toString")).call(this, key);
            throw this.error("Cannot read property '" + name ? name.content : "[no toString func]" + "' of null", ctx.$key);
        } else {
            val = new Member(val, key, val.getProp(key));
        }
        return val;
    }

    MemberExpression$call(ctx, { val }) {
        const args = this.visit(ctx.Arguments);
        if (val instanceof Member) val = val.value;
        if (val instanceof Func || val instanceof NativeFunc) {
            // TODO: ???? check if this works
            return assign(val.call(this, val, args));
        } else {
            throw this.error("Cannot call value of other type than Func", ctx.Arguments);
        }
    }

    Arguments(ctx) {
        const args = [];
        for (let arg of (ctx.$args || [])) {
            args.push(assign(this.visit(arg)));
        }
        return args;
    }

    UnaryExpression(ctx) {
        if (!ctx.$unary) return this.visit(ctx.$left);

        let val = assign(this.visit(ctx.$left));
        if (val instanceof Member) val = val.value;

        switch (ctx.$unary[0].image) {
            case "+":
                return new NumberLiteral(+val.content);
            case "-":
                return new NumberLiteral(-val.content);
            case "!":
                return new BooleanLiteral(!val.content);
        }
    }

    UpdateExpression(ctx) {
        if (!ctx.$right) return this.visit(ctx.$left);

        const right = this.visit(ctx.$right);
        if (right instanceof Member) {
            switch (ctx.$prefix[0].image) {
                case "++":
                    right.update(new NumberLiteral(right.value.content + 1));
                case "--":
                    right.update(new NumberLiteral(right.value.content - 1));
            }
        } else if (right instanceof Variable) {
            switch (ctx.$prefix[0].image) {
                case "++":
                    right.value = new NumberLiteral(right.value.content + 1);
                case "--":
                    right.value = new NumberLiteral(right.value.content - 1);
            }
        } else {
            throw this.error("Cannot increment/decrement a staticly defined literal (Number, String, etc. that is not declared as a variable)", ctx.$prefix);
        }
    }

    MultiExpression(ctx) {
        if (!ctx.$right) return this.visit(ctx.$left);

        let left = assign(this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        switch (ctx.$op[0].image) {
            case "*":
                return new NumberLiteral(left.content * right.content);
            case "/":
                return new NumberLiteral(left.content / right.content);
            case "%":
                return new NumberLiteral(left.content % right.content);
            case "^":
                return new NumberLiteral(left.content ** right.content);
        }
    }

    AdditiveExpression(ctx) {
        if (!ctx.$right) return this.visit(ctx.$left);

        let left = assign(this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        switch (ctx.$op[0].image) {
            case "+":
                if (left instanceof NumberLiteral && right instanceof NumberLiteral) {
                    return new NumberLiteral(left.content + right.content);
                } else {
                    const leftprop = left.getProp(new StringLiteral("toString"));
                    const rightprop = right.getProp(new StringLiteral("toString"));
                    return new StringLiteral(
                        (leftprop ? leftprop.call(this, left).content : "[no toString func]") +
                        (rightprop ? rightprop.call(this, right).content : "[no toString func]")
                    );
                }
            case "-":
                return new NumberLiteral(left.content - right.content);
        }
    }

    RelationalExpression(ctx) {
        if (!ctx.$right) return this.visit(ctx.$left);

        let left = assign(this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        switch (ctx.$op[0].image) {
            case "<":
                if (left instanceof NumberLiteral && right instanceof NumberLiteral) {
                    return new BooleanLiteral(left.content < right.content);
                }
                return new BooleanLiteral(false);
            case ">":
                if (left instanceof NumberLiteral && right instanceof NumberLiteral) {
                    return new BooleanLiteral(left.content > right.content);
                }
                return new BooleanLiteral(false);
            case "<=":
                if (left instanceof NumberLiteral && right instanceof NumberLiteral) {
                    return new BooleanLiteral(left.content <= right.content);
                }
                return new BooleanLiteral(false);
            case ">=":
                if (left instanceof NumberLiteral && right instanceof NumberLiteral) {
                    return new BooleanLiteral(left.content >= right.content);
                }
                return new BooleanLiteral(false);
        }
    }

    EqualityExpression(ctx) {
        if (!ctx.$right) return this.visit(ctx.$left);

        let left = assign(this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        switch (ctx.$op[0].image) {
            case "==":
                return new Boolean(left.content === right.content);
            case "!=":
                return new Boolean(left.content !== right.content);
        }
    }

    LogicalAndExpression(ctx) {
        if (!ctx.$right) return this.visit(ctx.$left);

        let left = assign(this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        return new BooleanLiteral(toBool(left) && toBool(right));
    }

    LogicalOrExpression(ctx) {
        if (!ctx.$right) return this.visit(ctx.$left);

        let left = assign(this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        return new BooleanLiteral(toBool(left) || toBool(right));
    }

    ConditionalExpression(ctx) {
        if (!ctx.$then) return this.visit(ctx.$if);

        let val = assign(this.visit(ctx.$if));
        if (val instanceof Member) val = val.value;

        const expression = toBool(val);
        if (expression) {
            return this.visit(ctx.$then);
        } else {
            return this.visit(ctx.$else);
        }
    }

    AssignmentExpression(ctx) {
        if (!ctx.$right) {
            let left = assign(this.visit(ctx.$left));
            if (left instanceof Member) left = left.value;
            return left;
        }

        const variable = this.visit(ctx.$left);
        let right = assign(this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        if (variable instanceof Member || variable instanceof Variable) {
            const left = variable.value;
            switch (ctx.$op[0].image) {
                case "=":
                    return variable.update(right);
                case "+=":
                    if (left instanceof NumberLiteral && right instanceof NumberLiteral) {
                        return variable.update(new NumberLiteral(left.content + right.content));
                    } else {
                        const leftprop = left.getProp(new StringLiteral("toString"));
                        const rightprop = right.getProp(new StringLiteral("toString"));
                        return variable.update(new StringLiteral(
                            (leftprop ? leftprop.call(this, left).content : "[no toString func]") +
                            (rightprop ? rightprop.call(this, right).content : "[no toString func]")
                        ));
                    }
                case "-=":
                    return variable.update(new NumberLiteral(left.content - right.content));
                case "*=":
                    return variable.update(new NumberLiteral(left.content * right.content));
                case "/=":
                    return variable.update(new NumberLiteral(left.content / right.content));
                case "%=":
                    return variable.update(new NumberLiteral(left.content % right.content));
                case "^=":
                    return variable.update(new NumberLiteral(left.content ** right.content));
            }
        } else {
            throw this.error("Cannot assign to a static literal", ctx.$op);
        }
    }

    Expression(ctx) {
        let val = new NullLiteral;
        for (const expr of ctx.$expression) {
            val = this.visit(expr);
        }
        return val;
    }

    Statement(ctx) {
        return this.visit(ctx.$statement);
    }

    BlockStatement(ctx) {
        if (ctx.$list) return this.visit(ctx.$list);
    }

    StatementList(ctx) {
        this.statementStack.push(ctx);

        let value = new NullLiteral;
        for (const statement of ctx.$statement) {
            value = this.visit(statement);
            if (isReturn(value)) break;
        }

        this.statementStack.pop();
        return value;
    }

    VariableStatement(ctx) {
        // TODO: ALL OF THIS (currently assignment expressions are treated as variable statements)
        this.visit(ctx.VariableDeclaration);
    }

    VariableDeclaration(ctx) {
        // TODO: ALL OF THIS (currently assignment expressions are treated as variable statements)

        const name = ctx.Identifier[0].image;
        const variable =
            this.varsPerStatement.getVariable(name, this) ||
            this.varsPerStatement.createVariable(name, ctx, this);
        const value = assign(this.visit(ctx.$value));
        return variable.update(value);
    }

    EmptyStatement(ctx) {
        return;
    }

    ExpressionStatement(ctx) {
        this.visit(ctx.Expression);
    }

    IfStatement(ctx) {
        this.statementStack.push(ctx);

        const expression = this.visit(ctx.$expression);
        const bool = toBool(assign(expression));

        if (bool) {
            this.statementStack.push(ctx.$then[0]);
            this.visit(ctx.$then);
            this.statementStack.pop();
        } else if (ctx.$else) {
            this.statementStack.push(ctx.$else[0]);
            this.visit(ctx.$else);
            this.statementStack.pop();
        }

        this.statementStack.pop();
    }

    WhileIterationStatement(ctx) {
        const check = () => toBool(assign(this.visit(ctx.$expression)));
        const callBody = () => {
            this.statementStack.push(ctx.$body[0]);
            const val = this.visit(ctx.$body);
            this.statementStack.pop();
            return val;
        };

        this.statementStack.push(ctx);

        let itrLeft = 100000;
        let bool = false;
        while ((bool = check()) && itrLeft > 0) {
            itrLeft--;
            const val = callBody();
            if (isBreak(val)) break;
        }
        if (itrLeft === 0 && bool) {
            throw this.error("While loop is iterating more than 100000", ctx.WhileTok);
        }

        this.statementStack.pop();
    }

    ForIterationStatement(ctx) {
        const callBody = () => {
            this.statementStack.push(ctx.$body[0]);
            const val = this.visit(ctx.$body);
            this.statementStack.pop();
            return val;
        };

        if (ctx.$left) {
            this.statementStack.push(ctx);

            this.visit(ctx.$left);

            const middleRef = ctx.$middle;
            const rightRef = ctx.$right;

            const checkMiddle = () => toBool(assign(this.visit(middleRef)));
            const callRight = () => this.visit(rightRef);

            let itrLeft = 100000;
            let bool = false;
            while ((bool = checkMiddle()) && itrLeft > 0) {
                itrLeft--;
                if (isBreak(callBody())) break;
                callRight();
            }
            if (itrLeft === 0 && bool) {
                throw this.error("For loop is iterating more than 100000", ctx.ForTok);
            }

            this.statementStack.pop();
        } else {
            this.statementStack.push(ctx);

            const varname = ctx.Identifier[0].image;
            const variable =
                this.varsPerStatement.getVariable(varname, this) ||
                this.varsPerStatement.createVariable(varname, ctx, this);

            const value = assign(this.visit(ctx.$value));
            if (value instanceof NumberLiteral) {
                const size = value.content;
                if (!Number.isFinite(size)) {
                    throw this.error("Cannot loop over Infinity", ctx.$value);
                }
                for (let i = 0; i < size; i++) {
                    variable.update(new NumberLiteral(i));
                    if (isBreak(callBody())) break;
                }
            } else if (value instanceof StringLiteral) {
                const size = value.content.length;
                const str = value.content;
                for (let i = 0; i < size; i++) {
                    variable.update(new StringLiteral(str.charAt(i)));
                    if (isBreak(callBody())) break;
                }
            } else if (value instanceof ArrayLiteral) {
                const arr = value.content;
                for (let elem of arr) {
                    variable.update(elem);
                    if (isBreak(callBody())) break;
                }
            } else if (value instanceof ObjectLiteral) {
                const arr = value.getProp(new StringLiteral("keys")).call(this, value).content;
                for (let elem of arr) {
                    variable.update(elem);
                    if (isBreak(callBody())) break;
                }
            } else if (value instanceof NullLiteral) {
                throw this.error("Cannot iterate over 'null'", ctx.$value);
            } else if (value instanceof BooleanLiteral) {
                throw this.error("Cannot iterate over a boolean value", ctx.$value);
            } else if (value instanceof Func) {
                throw this.error("Cannot iterate over a function reference", ctx.$value);
            } else {
                throw this.error("Cannot iterate over unknown type", ctx.$value);
            }

            this.statementStack.pop();
        }
    }

    ContinueStatement() {
        return new ContinueInterrupt;
    }

    BreakStatement() {
        return new BreakInterrupt;
    }

    ReturnStatement(ctx) {
        if (!ctx.$value) return new ReturnInterrupt;

        const value = assign(this.visit(ctx.$value));
        return new ReturnInterrupt(value);
    }

    ReplyStatement(ctx) {
        if (!ctx.$value) return new ReplyInterrupt;

        // it isn't very elegant, but throwing the reply value is easiest way 
        // to get the result straight away
        const value = assign(this.visit(ctx.$value));
        throw new ReplyInterrupt(value);
    }

    FunctionDeclaration(ctx) {
        const name = ctx.Identifier[0].image;
        if (this.varsPerStatement.checkVariable(name, this)) 
            throw this.error("Variable '" + name + "' already declared", ctx.Identifier);

        const variable = this.varsPerStatement.createVariable(name, ctx, this);

        const args = ctx.FormalParameterList ? this.visit(ctx.FormalParameterList) : [];

        const func = new Func(name, args, this.statementStack.clone(), ctx.FunctionBody[0]);

        return variable.update(func);
    }

    FunctionExpression(ctx) {
        const args = ctx.FormalParameterList ? this.visit(ctx.FormalParameterList) : [];

        return new Func(null, args, this.statementStack.clone(), ctx.FunctionBody[0]);
    }

    FormalParameterList(ctx) {
        const args = [];
        for (let arg of ctx.$args) {
            const name = arg.image;
            if (args.some(a => a === name)) throw this.error("Argument '" + name + "' already declared in argument list!", arg);

            if (this.varsPerStatement.checkVariable(name, this))
                throw this.error("Variable '" + name + "' already declared", arg);
            
            args.push(name);
        }
        return args;
    }

    FunctionBody(ctx) {
        if (ctx.StatementList) return this.visit(ctx.StatementList);
    }

    Program(ctx) {
        try {
            this.statementStack.pushChange(new StatementStack([]));
            this.statementStack.push(ctx);

            if (ctx.StatementList) {
                // const value = this.visit(ctx.StatementList);
                // if (isReturn(value)) {
                //     throw this.error("");
                // }
                this.visit(ctx.StatementList);
            }

            this.statementStack.pop();
            this.statementStack.popChange();

            this.cleanup();
        } catch (reply) {
            this.statementStack.pop();
            this.statementStack.popChange();

            this.cleanup();

            if (reply instanceof ReplyInterrupt) {
                return reply.value;
            } else {
                throw reply;
            }
        }
    }
}

module.exports = new CCInterpreter();