const { timeout } = require("../../../../modules/util");
const { parseHumanTime } = require("../../../../modules/util/time");
const { splitArgs } = require("../../../../modules/util/string");
const { tokens: { WhiteSpace, LineTerminator, MultiLineComment, SingleLineComment } } = require("../lexer/tokens");
const parser = require("../parser");
const { RuntimeError } = require("../errors");
const {
    toBool,
    assign,
    isReturn,
    isBreak,
    createStringLiteral,
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

    TimeLiteral,
    DurationLiteral,

    Message,
    Guild,

    convert
} = require("./classes");

const GLOBALS = require("./globals");

// ----------------- Interpreter -----------------
// Obtains the default CstVisitor constructor to extend.
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

// All our semantics go into the visitor, completly separated from the grammar.
class CCInterpreter extends BaseCstVisitor {
    constructor(commandId, guildId) {
        super();
        // This helper will detect any missing or redundant methods on this visitor
        // this.validateVisitor();

        this.id = commandId;
        this.guildId = guildId;

        /** @type {string} */
        this.text_input = null;

        this.varsPerStatement = new VariableStack;

        this.statementStack = new StatementManager;
    }

    /**
     * @param {string} msg 
     * @param {{ startOffset: number, startLine: number, startColumn: number}} item
     * @returns {RuntimeError}
     */
    error(msg, item) {
        if (item) {
            if (item instanceof Array) item = item[0];
            while (item.children) item = item.children[Object.getOwnPropertyNames(item.children)[0]][0];
            return new RuntimeError(msg, item.startOffset, item.startLine, item.startColumn, this.text_input);
        }
        return new RuntimeError(msg);
    }

    cleanup() {
        this.text_input = null;
        this.varsPerStatement.clear();
        this.statementStack.clear();
    }

    ///////// Main functions //////////

    async PrimaryExpression(ctx) {
        if (ctx.Identifier) {
            const identifier = ctx.Identifier[0];
            const name = identifier.image;
            const variable = this.varsPerStatement.getVariable(name, this);

            if (variable) return variable;

            if (GLOBALS[name]) return GLOBALS[name];

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
                // eslint-disable-next-line no-case-declarations
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
            return await this.visit(ctx.ArrayLiteral);
        } else if (ctx.ObjectLiteral) {
            return await this.visit(ctx.ObjectLiteral);
        } else if (ctx.FunctionExpression) {
            return await this.visit(ctx.FunctionExpression);
        } else if (ctx.ParenExpression) {
            return await this.visit(ctx.ParenExpression);
        }
    }

    async ParenExpression(ctx) {
        return await this.visit(ctx.$body);
    }

    async ArrayLiteral(ctx) {
        const arr = [];
        if (ctx.$elements) {
            for (const elem of ctx.$elements) {
                arr.push(assign(await this.visit(elem)));
            }
        }
        return new ArrayLiteral(arr);
    }

    async ObjectLiteral(ctx) {
        const obj = {};
        const list = await this.visit(ctx.PropertyDefinitionList);
        for (const [key, value] of list) {
            obj[key] = value;
        }
        return new ObjectLiteral(obj);
    }

    async PropertyDefinitionList(ctx) {
        const list = [];
        for (const elem of ctx.PropertyDefinition) {
            list.push(await this.visit(elem));
        }
        return list;
    }

    async PropertyDefinition(ctx) {
        if (ctx.PropertyName) {
            const key = await this.visit(ctx.PropertyName);
            const value = assign(await this.visit(ctx.$value));
            return [key, value];
        } else if (ctx.MethodDefinition) {
            return await this.visit(ctx.MethodDefinition);
        }
    }

    PropertyName(ctx) {
        if (ctx.IdentifierName) {
            return ctx.IdentifierName[0].image;
        } else if (ctx.StringLiteral) {
            return createStringLiteral(ctx.StringLiteral[0].image, this).content;
        }
    }

    async MethodDefinition(ctx) {
        this.statementStack.push(ctx);

        const name = await this.visit(ctx.PropertyName);
        const args = ctx.FormalParameterList ? (await this.visit(ctx.FormalParameterList)) : [];
        const func = new Func(name, args, this.statementStack.clone(), ctx.FunctionBody[0]);

        this.statementStack.pop();

        return [name, func];
    }

    async MemberExpression(ctx) {
        if (!ctx.$member) return await this.visit(ctx.$left);

        /** @type {Item} */
        let val = assign(await this.visit(ctx.$left));
        for (let i = 0; i < ctx.$member.length; i++) {
            val = await this.visit(ctx.$member[i], { val });
        }
        return val;
    }

    async MemberExpression$member(ctx, { val }) {
        if (ctx.$square) {
            val = await this.visit(ctx.$square, { val });
        } else if (ctx.$dot) {
            val = await this.visit(ctx.$dot, { val });
        } else if (ctx.$call) {
            val = await this.visit(ctx.$call, { val });
        }
        return val;
    }

    async MemberExpression$square(ctx, { val }) {
        const key = assign(await this.visit(ctx.$key));
        if (val instanceof NullLiteral) {
            const name = await key.getProp(new StringLiteral("toString")).call(this, key);
            throw this.error("Cannot read property '" + name ? name.content : "[no toString func]" + "' of null", ctx.$key);
        } else if (val instanceof Member) {
            val = new Member(val, key, val.value.getProp(key));
        } else {
            val = new Member(val, key, val.getProp(key));
        }
        return val;
    }

    async MemberExpression$dot(ctx, { val }) {
        const key = new StringLiteral(ctx.$key[0].image);
        if (val instanceof NullLiteral) {
            const name = await key.getProp(new StringLiteral("toString")).call(this, key);
            throw this.error("Cannot read property '" + (name ? name.content : "[no toString func]") + "' of null", ctx.$key);
        } else if(val instanceof Member) {
            val = new Member(val, key, val.value.getProp(key));
        } else {
            val = new Member(val, key, val.getProp(key));
        }
        return val;
    }

    async MemberExpression$call(ctx, { val }) {
        const args = await this.visit(ctx.Arguments);
        let func = val;
        if (val instanceof Member) {
            func = val.value;
            val = val.parent;
        }
        if (func instanceof Func || func instanceof NativeFunc) {
            // TODO: ???? check if this works
            return assign(await func.call(this, val, args));
        } else {
            throw this.error("Cannot call value of other type than Func", ctx.Arguments);
        }
    }

    async Arguments(ctx) {
        const args = [];
        for (let arg of (ctx.$args || [])) {
            args.push(assign(await this.visit(arg)));
        }
        return args;
    }

    async UnaryExpression(ctx) {
        if (!ctx.$unary) return await this.visit(ctx.$left);

        let val = assign(await this.visit(ctx.$left));
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

    async UpdateExpression(ctx) {
        if (!ctx.$right) return await this.visit(ctx.$left);

        const right = await this.visit(ctx.$right);
        if (right instanceof Member) {
            if (ctx.$prefix) {
                switch (ctx.$prefix[0].image) {
                    case "++":
                        return right.update(new NumberLiteral(right.value.content + 1));
                    case "--":
                        return right.update(new NumberLiteral(right.value.content - 1));
                }
            } else {
                const oldval = right.value;
                switch (ctx.$postfix[0].image) {
                    case "++":
                        right.update(new NumberLiteral(right.value.content + 1));
                        break;
                    case "--":
                        right.update(new NumberLiteral(right.value.content - 1));
                }
                return oldval;
            }
        } else if (right instanceof Variable) {
            if (ctx.$prefix) {
                switch (ctx.$prefix[0].image) {
                    case "++":
                        return right.update(new NumberLiteral(right.value.content + 1));
                    case "--":
                        return right.update(new NumberLiteral(right.value.content - 1));
                }
            } else {
                const oldval = right.value;
                switch (ctx.$prefix[0].image) {
                    case "++":
                        right.update(new NumberLiteral(right.value.content + 1));
                        break;
                    case "--":
                        right.update(new NumberLiteral(right.value.content - 1));
                }
                return oldval;
            }
        } else {
            throw this.error("Cannot increment/decrement a staticly defined literal (Number, String, etc. that is not declared as a variable)", ctx.$prefix);
        }
    }

    async MultiExpression(ctx) {
        if (!ctx.$right) return await this.visit(ctx.$left);

        let left = assign(await this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(await this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        switch (ctx.$op[0].image) {
            case "*":
                if (left instanceof DurationLiteral && right instanceof NumberLiteral && !(right instanceof TimeLiteral || right instanceof DurationLiteral)) {
                    return left.clone().multiply(right);
                }
                return new NumberLiteral(left.content * right.content);
            case "/":
                if (left instanceof DurationLiteral && right instanceof NumberLiteral && !(right instanceof TimeLiteral || right instanceof DurationLiteral)) {
                    return left.clone().multiply(1 / right);
                }
                return new NumberLiteral(left.content / right.content);
            case "%":
                return new NumberLiteral(left.content % right.content);
            case "^":
                return new NumberLiteral(left.content ** right.content);
        }
    }

    async AdditiveExpression(ctx) {
        if (!ctx.$right) return await this.visit(ctx.$left);

        let left = assign(await this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(await this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        switch (ctx.$op[0].image) {
            case "+":
                if (left instanceof NumberLiteral && right instanceof NumberLiteral) {
                    if (!(right instanceof TimeLiteral) && (left instanceof TimeLiteral || left instanceof DurationLiteral)) 
                        return left.clone().add(right);
                    return new NumberLiteral(left.content + right.content);
                } else {
                    const leftprop = left.getProp(new StringLiteral("toString"));
                    const rightprop = right.getProp(new StringLiteral("toString"));
                    return new StringLiteral(
                        (leftprop ? (await leftprop.call(this, left).content) : "[no toString func]") +
                        (rightprop ? (await rightprop.call(this, right).content) : "[no toString func]")
                    );
                }
            case "-":
                if ((left instanceof TimeLiteral || left instanceof DurationLiteral) &&
                    right instanceof NumberLiteral && !(right instanceof TimeLiteral)) {
                    return left.clone().subtract(right);
                }
                return new NumberLiteral(left.content - right.content);
        }
    }

    async RelationalExpression(ctx) {
        if (!ctx.$right) return await this.visit(ctx.$left);

        let left = assign(await this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(await this.visit(ctx.$right));
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

    async EqualityExpression(ctx) {
        if (!ctx.$right) return await this.visit(ctx.$left);

        let left = assign(await this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(await this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        switch (ctx.$op[0].image) {
            case "==":
                return new Boolean(left.content === right.content);
            case "!=":
                return new Boolean(left.content !== right.content);
        }
    }

    async LogicalAndExpression(ctx) {
        if (!ctx.$right) return await this.visit(ctx.$left);

        let left = assign(await this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(await this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        return new BooleanLiteral(toBool(left) && toBool(right));
    }

    async LogicalOrExpression(ctx) {
        if (!ctx.$right) return await this.visit(ctx.$left);

        let left = assign(await this.visit(ctx.$left));
        if (left instanceof Member) left = left.value;
        let right = assign(await this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        return new BooleanLiteral(toBool(left) || toBool(right));
    }

    async ConditionalExpression(ctx) {
        if (!ctx.$then) return await this.visit(ctx.$if);

        let val = assign(await this.visit(ctx.$if));
        if (val instanceof Member) val = val.value;

        const expression = toBool(val);
        if (expression) {
            return await this.visit(ctx.$then);
        } else {
            return await this.visit(ctx.$else);
        }
    }

    async AssignmentExpression(ctx) {
        if (!ctx.$right) {
            let left = assign(await this.visit(ctx.$left));
            if (left instanceof Member) left = left.value;
            return left;
        }

        const variable = await this.visit(ctx.$left);
        let right = assign(await this.visit(ctx.$right));
        if (right instanceof Member) right = right.value;

        if (variable instanceof Member || variable instanceof Variable) {
            const left = variable.value;
            switch (ctx.$op[0].image) {
                case "=":
                    return variable.update(right);
                // eslint-disable-next-line no-case-declarations
                case "+=":
                    if (left instanceof NumberLiteral && right instanceof NumberLiteral) {
                        if (!(right instanceof TimeLiteral) && (left instanceof TimeLiteral || left instanceof DurationLiteral))
                            return left.add(right);
                        return variable.update(new NumberLiteral(left.content + right.content));
                    }
                    const leftprop = left.getProp(new StringLiteral("toString"));
                    const rightprop = right.getProp(new StringLiteral("toString"));
                    return variable.update(new StringLiteral(
                        (leftprop ? (await leftprop.call(this, left).content) : "[no toString func]") +
                        (rightprop ? (await rightprop.call(this, right).content) : "[no toString func]")
                    ));
                case "-=":
                    if ((left instanceof TimeLiteral || left instanceof DurationLiteral) &&
                        right instanceof NumberLiteral && !(right instanceof TimeLiteral)) {
                        return left.subtract(right);
                    }
                    return variable.update(new NumberLiteral(left.content - right.content));
                case "*=":
                    if (left instanceof DurationLiteral && right instanceof NumberLiteral && !(right instanceof TimeLiteral || right instanceof DurationLiteral)) {
                        return left.multiply(right);
                    }
                    return variable.update(new NumberLiteral(left.content * right.content));
                case "/=":
                    if (left instanceof DurationLiteral && right instanceof NumberLiteral && !(right instanceof TimeLiteral || right instanceof DurationLiteral)) {
                        return left.multiply(1 / right);
                    }
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

    async Expression(ctx) {
        let val = new NullLiteral;
        for (const expr of ctx.$expression) {
            val = await this.visit(expr);
        }
        return val;
    }

    async Statement(ctx) {
        return await this.visit(ctx.$statement);
    }

    async BlockStatement(ctx) {
        if (ctx.$list) return await this.visit(ctx.$list);
    }

    async StatementList(ctx) {
        this.statementStack.push(ctx);

        let value = new NullLiteral;
        for (const statement of ctx.$statement) {
            value = await this.visit(statement);
            if (isReturn(value)) break;
        }

        this.statementStack.pop();
        return value;
    }

    async VariableStatement(ctx) {
        // TODO: ALL OF THIS (currently assignment expressions are treated as variable statements)
        await this.visit(ctx.VariableDeclaration);
    }

    async VariableDeclaration(ctx) {
        // TODO: ALL OF THIS (currently assignment expressions are treated as variable statements)

        const name = ctx.Identifier[0].image;
        const variable =
            this.varsPerStatement.getVariable(name, this) ||
            this.varsPerStatement.createVariable(name, ctx, this);
        const value = assign(await this.visit(ctx.$value));
        return variable.update(value);
    }

    EmptyStatement() {
        return;
    }

    async ExpressionStatement(ctx) {
        await this.visit(ctx.Expression);
    }

    async IfStatement(ctx) {
        this.statementStack.push(ctx);

        const expression = await this.visit(ctx.$expression);
        const bool = toBool(assign(expression));

        if (bool) {
            this.statementStack.push(ctx.$then[0]);
            await this.visit(ctx.$then);
            this.statementStack.pop();
        } else if (ctx.$else) {
            this.statementStack.push(ctx.$else[0]);
            await this.visit(ctx.$else);
            this.statementStack.pop();
        }

        this.statementStack.pop();
    }

    async WhileIterationStatement(ctx) {
        const check = async () => toBool(assign(await this.visit(ctx.$expression)));
        const callBody = async () => {
            this.statementStack.push(ctx.$body[0]);
            const val = await this.visit(ctx.$body);
            this.statementStack.pop();
            return val;
        };

        this.statementStack.push(ctx);

        let itrLeft = 100000;
        let bool = false;
        while ((bool = await check()) && itrLeft > 0) {
            itrLeft--;
            const val = await callBody();
            if (isBreak(val)) break;
        }
        if (itrLeft === 0 && bool) {
            throw this.error("While loop is iterating more than 100000", ctx.WhileTok);
        }

        this.statementStack.pop();
    }

    async ForIterationStatement(ctx) {
        const callBody = async () => {
            this.statementStack.push(ctx.$body[0]);
            const val = await this.visit(ctx.$body);
            this.statementStack.pop();
            return val;
        };

        if (ctx.$left) {
            this.statementStack.push(ctx);

            await this.visit(ctx.$left);

            const middleRef = ctx.$middle;
            const rightRef = ctx.$right;

            const checkMiddle = async () => toBool(assign(await this.visit(middleRef)));
            const callRight = async () => await this.visit(rightRef);

            let itrLeft = 100000;
            let bool = false;
            while ((bool = await checkMiddle()) && itrLeft > 0) {
                itrLeft--;
                if (isBreak(await callBody())) break;
                await callRight();
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

            const value = assign(await this.visit(ctx.$value));
            if (value instanceof NumberLiteral) {
                const size = value.content;
                if (!Number.isFinite(size)) {
                    throw this.error("Cannot loop over Infinity", ctx.$value);
                }
                for (let i = 0; i < size; i++) {
                    variable.update(new NumberLiteral(i));
                    if (isBreak(await callBody())) break;
                }
            } else if (value instanceof StringLiteral) {
                const size = value.content.length;
                const str = value.content;
                for (let i = 0; i < size; i++) {
                    variable.update(new StringLiteral(str.charAt(i)));
                    if (isBreak(await callBody())) break;
                }
            } else if (value instanceof ArrayLiteral) {
                const arr = value.content;
                for (let elem of arr) {
                    variable.update(elem);
                    if (isBreak(await callBody())) break;
                }
            } else if (value instanceof ObjectLiteral) {
                const arr = await value.getProp(new StringLiteral("keys")).call(this, value).content;
                for (let elem of arr) {
                    variable.update(elem);
                    if (isBreak(await callBody())) break;
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

    async ReturnStatement(ctx) {
        if (!ctx.$value) return new ReturnInterrupt;

        const value = assign(await this.visit(ctx.$value));
        return new ReturnInterrupt(value);
    }

    async SleepStatement(ctx) {
        if (!ctx.$value) {
            throw this.error("Missing sleeping duration", ctx.SleepTok);
        }

        // it isn't very elegant, but throwing the reply value is easiest way 
        // to get the result straight away
        const value = assign(await this.visit(ctx.$value));

        if (!(value instanceof NumberLiteral)) {
            throw this.error("Sleeping duration must be a number", ctx.$value);
        }
        if (value.content > Number.MAX_SAFE_INTEGER) {
            throw this.error("Cannot sleep for Infinity", ctx.$value);
        }
        if (value.content < 0) {
            throw this.error("Sleeping duration must be a positive number", ctx.$value);
        }

        await timeout(value.content);
    }

    async ReplyStatement(ctx) {
        if (!ctx.$value) return new ReplyInterrupt;

        // it isn't very elegant, but throwing the reply value is easiest way 
        // to get the result straight away
        const value = assign(await this.visit(ctx.$value));
        throw new ReplyInterrupt(value);
    }

    async FunctionDeclaration(ctx) {
        const name = ctx.Identifier[0].image;
        if (this.varsPerStatement.checkVariable(name, this))
            throw this.error("Variable '" + name + "' already declared", ctx.Identifier);

        const variable = this.varsPerStatement.createVariable(name, ctx, this);

        const args = ctx.FormalParameterList ? (await this.visit(ctx.FormalParameterList)) : [];

        const func = new Func(name, args, this.statementStack.clone(), ctx.FunctionBody[0]);

        return variable.update(func);
    }

    async FunctionExpression(ctx) {
        const args = ctx.FormalParameterList ? (await this.visit(ctx.FormalParameterList)) : [];

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

    async FunctionBody(ctx) {
        if (ctx.StatementList) return await this.visit(ctx.StatementList);
    }

    /**
     * 
     * @param {{}} ctx 
     * @param {{ args }} message 
     */
    async Program(ctx, { msg, args, guild }) {
        this.statementStack.pushChange(new StatementStack([]));
        this.statementStack.push(ctx);

        try {
            if (ctx.StatementList) {
                const $msg = await Message(this, msg);
                const $text = $msg.content.text;
                const $user = $msg.content.member;
                const $member = $msg.content.member;
                const $channel = $msg.content.channel;
                const $mentions = $msg.content.mentions;

                const $args = new ArrayLiteral(args.map(s => new StringLiteral(s)));

                /*
                 * allowed types:
                 * String, Number, Boolean, Duration, Time, Channel, Member, Role
                 */
                const parseArgs = new NativeFunc("parseArgs", function (_, ...args) {
                    if (args.length === 0) return $args;
                    else if (args.length === 1 && args[0] instanceof NumberLiteral) {
                        const split = splitArgs(msg.text, args[0].content);
                        return convert(split);
                    }
                    else if (args.every(arg => arg instanceof NativeFunc)) {
                        const arr = [];
                        const numberReg = /[0-9]+(?:\.[0-9]+)/;
                        const whitespaceReg = /(?:(?:[\t\f\v\u0020\u2028\u2029\u00A0\uFEFF])|(?:\r?\n))+/;
                        const strReg = /[^\s]+/;
                        const boolReg = /\b(true|false|yes|no)\b/i;
                        const durReg = /(?:(?:[0-9]+\.)?[0-9]+[smhdw])+/i;
                        let str = msg.text;

                        let i = 0;
                        for (let type of args) {
                            let match = str.match(whitespaceReg);
                            if (match) str = str.slice(match[0].length);
                            
                            switch (type) {
                                case GLOBALS.Boolean:
                                    match = str.match(boolReg);
                                    if (match) {
                                        if (/true|yes/i.test(match[0])) arr.push(new BooleanLiteral(true));
                                        else arr.push(new BooleanLiteral(false));
                                        str = str.slice(match[0].length);
                                    }
                                    break;
                                case GLOBALS.Number:
                                    match = str.match(numberReg);
                                    if (match) {
                                        arr.push(new NumberLiteral(parseFloat(match[0])));
                                        str = str.slice(match[0].length);
                                    }
                                    break;
                                case GLOBALS.Duration:
                                    match = str.match(durReg);
                                    if (match) {
                                        arr.push(new DurationLiteral(parseHumanTime(match[0])));
                                        str = str.slice(match[0].length);
                                    }
                                    break;
                                case GLOBALS.String:
                                    if (i === args.length - 1) {
                                        arr.push(new StringLiteral(str));
                                        break;
                                    }
                                    match = str.match(strReg);
                                    if (match) {
                                        arr.push(new StringLiteral(match[0]));
                                        str = str.slice(match[0].length);
                                    }
                                    break;
                            }

                            i++;
                        }

                    } else {
                        return new NullLiteral;
                    }
                });

                const $react = new NativeFunc("$react", async function (interpreter, ...args) {
                    return $msg.content.react.call(interpreter, $msg, args);
                });

                const $guild = await Guild(this, guild);

                this.varsPerStatement.createVariable("$msg", ctx, this).update($msg);
                this.varsPerStatement.createVariable("$text", ctx, this).update($text);
                this.varsPerStatement.createVariable("$user", ctx, this).update($user);
                this.varsPerStatement.createVariable("$member", ctx, this).update($member);
                this.varsPerStatement.createVariable("$channel", ctx, this).update($channel);
                this.varsPerStatement.createVariable("$mentions", ctx, this).update($mentions);
                this.varsPerStatement.createVariable("$args", ctx, this).update($args);
                this.varsPerStatement.createVariable("$react", ctx, this).update($react);
                this.varsPerStatement.createVariable("$guild", ctx, this).update($guild);

                this.varsPerStatement.createVariable("parseArgs", ctx, this).update(parseArgs);

                await this.visit(ctx.StatementList);
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

module.exports = CCInterpreter;