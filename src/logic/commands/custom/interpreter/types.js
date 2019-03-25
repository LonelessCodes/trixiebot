const { StatementStack, StatementManager } = require("./StatementManager");

const RESERVED_KEYWORDS = [
    "func", "return", "for", "of", "while", "break", "continue", "if", "then", "else", "reply", "and", "or", "null", "true", "false", "sleep"
];

/**
 * @param {Item} item 
 */
function toBool(item) {
    let val = true;
    if (item instanceof NullLiteral) val = false;
    if (item instanceof BooleanLiteral) val = item.content;
    return val;
}

function isReturn(item) {
    return item instanceof ReturnInterrupt;
}

function isBreak(item) {
    return item instanceof BreakInterrupt;
}

/**
 * @param {Item|Variable} item 
 * @returns {Item}
 */
function assign(item) {
    if (item instanceof Variable) return item.value;
    return item;
}

/** @param {string} str */
function createStringLiteral(str, interpreter) {
    str = str
        .substr(1, str.length - 2)
        .replace(/\\\\/g, "\\");

    if (str.startsWith("'")) str = str.replace(/\\'/g, "'");
    else str = str.replace(/\\"/g, "\"");

    str = str.replace(/\\r/g, "\r")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\b/g, "\x08")
        .replace(/\\f/g, "\f")
        .replace(/\\[0-7]{1,3}/g, str => {
            // octal escape sequence
            const charCode = parseInt(str.substr(1), 8);
            if (charCode > 255) throw interpreter.error("Constant is out of bounds");
            return String.fromCharCode(charCode);
        })
        .replace(/\\u[0-9a-fA-F]{4}/g, str => {
            // unicode escape sequence
            const charCode = parseInt(str.substr(2), 16);
            if (charCode > 65535) throw interpreter.error("Constant is out of bounds");
            return String.fromCharCode(charCode);
        })
        .replace(/\\/g, "");
    return new StringLiteral(str);
}

class Item {
    /**
     * @param {Literal} key 
     * @returns {Item}
     */
    getProp(key) {
        if (key instanceof StringLiteral &&
            this.proto[key.content] instanceof NativeFunc) {
            return this.proto[key.content];
        }
        return new NullLiteral;
    }
}
Item.prototype.proto = Object.create({});

class Func extends Item {
    /**
     * @param {string} funcName 
     * @param {Variable[]} args 
     * @param {StatementStack} statementStack
     * @param {*} ctx
     */
    constructor(funcName, args, statementStack, ctx) {
        super();

        this.funcName = funcName;
        this.args = args;
        this.statementStack = statementStack;
        this.ctx = ctx;
    }

    async call(interpreter, proto_parent, args = []) {
        interpreter.statementStack.pushChange(this.statementStack.clone());
        interpreter.statementStack.push(this.ctx);
        // interpreter.statementStack.pushFunctionCall(this.ctx);
        // interpreter.statementStack.push(this.ctx);

        for (let i = 0; i < this.args.length; i++) {
            const variable = interpreter.varsPerStatement.createVariable(this.args[i], this.ctx, this);
            variable.update(args[i] || new NullLiteral);
        }
        const val = await interpreter.visit(this.ctx);

        interpreter.statementStack.pop();
        // interpreter.statementStack.popFunctionCall(this.ctx);
        // interpreter.statementStack.pop();
        interpreter.statementStack.popChange();

        if (val instanceof ReturnInterrupt) {
            return assign(val.value);
        } else {
            return new NullLiteral;
        }
    }
}

class NativeFunc extends Func {
    constructor(funcName, cb) {
        if (arguments.length === 2) {
            super(funcName, []);

            this._cb = cb;
        } else if (arguments.length === 1) {
            super(null, []);

            this._cb = funcName;
        }
    }

    call(interpreter, proto_parent, args = []) {
        return this._cb.apply(proto_parent, [interpreter, ...args]);
    }
}
Func.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral(this.funcName ? `[Func: ${this.funcName}]` : "[Anonymous Func]");
});
NativeFunc.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral(this.funcName ? `[NativeFunc: ${this.funcName}]` : "[Anonymous NativeFunc]");
});

class Literal extends Item {
    constructor(content) {
        super();

        this.content = content;
    }
}
Literal.prototype.proto = Object.create({});

class NullLiteral extends Literal {
    constructor() {
        super(null);
        /** @type {null} */
        this.content;
    }
}
NullLiteral.prototype.proto = Object.create(Literal.prototype.proto);
NullLiteral.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral("null");
});

class BooleanLiteral extends Literal {
    constructor(content = false) {
        super(content);
        /** @type {boolean} */
        this.content;
    }
}
BooleanLiteral.prototype.proto = Object.create(Literal.prototype.proto);
BooleanLiteral.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral(this.content ? "true" : "false");
});

class NumberLiteral extends Literal {
    constructor(content = 0) {
        super(content);
        /** @type {number} */
        this.content;
    }
}
NumberLiteral.prototype.proto = Object.create(Literal.prototype.proto);
NumberLiteral.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral(this.content.toString());
});

class StringLiteral extends Literal {
    constructor(content = "") {
        super(content);
        /** @type {string} */
        this.content;
    }

    /**
     * @param {Literal} key
     */
    getProp(key) {
        if (key instanceof NumberLiteral) {
            if (this.content.length > key.content)
                return new StringLiteral(this.content.charAt(key.content));
            else return new NullLiteral;
        }
        return super.getProp(key);
    }

    setProp(key, value) {
        return value;
    }
}
StringLiteral.prototype.proto = Object.create(Literal.prototype.proto);
StringLiteral.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral(this.content);
});

class ArrayLiteral extends Literal {
    constructor(content = []) {
        super(content);
        /** @type {Item[]} */
        this.content;
    }

    /**
     * @param {Literal} key
     */
    getProp(key) {
        if (key instanceof NumberLiteral) {
            if (this.content.length > key.content)
                return this.content[key.content];
            else return new NullLiteral;
        }

        return super.getProp(key);
    }

    setProp(key, value) {
        if (key instanceof NumberLiteral) {
            return this.content[key.content] = value;
        }
    }
}
ArrayLiteral.prototype.proto = Object.create(Literal.prototype.proto);
ArrayLiteral.prototype.proto.toString = new NativeFunc(function toString(interpreter) {
    return new StringLiteral(this.content.map(elem => {
        const func = elem.getProp(new StringLiteral("toString"));
        if (func instanceof Func) return func.call(interpreter, elem).content;
        else if (func instanceof NullLiteral) return "[no toString func]";
        else if (func instanceof Literal) return func;
        else return "[no toString func]";
    }).join(", "));
});
ArrayLiteral.prototype.proto.size = new NativeFunc(function size() {
    return new NumberLiteral(this.content.length);
});

async function call(interpreter, func, args) {
    if (func instanceof Func || func instanceof NativeFunc) {
        // TODO: ???? check if this works
        return assign(await func.call(interpreter, func, args));
    } else {
        throw this.error("Cannot call value of other type than Func", ctx.Arguments);
    }
}

ArrayLiteral.prototype.proto.every = new NativeFunc(async function (_, func) {
    for (let i = 0; i < this.content.length; i++) {
        const val = await call(_, func, [this.content[i], i]);
        if (!val.content)
            return new BooleanLiteral(false);
    }
    return new BooleanLiteral(true);
});
ArrayLiteral.prototype.proto.concat = new NativeFunc(function concat(_, ...arrs) {
    return new ArrayLiteral(this.content.concat(...arrs.map(a => a.content)));
});
ArrayLiteral.prototype.proto.fill = new NativeFunc(async function (_, val) {
    this.content.fill(val);
    return this;
});
ArrayLiteral.prototype.proto.filter = new NativeFunc(async function (_, func) {
    const newArr = [];
    for (let i = 0; i < this.content.length; i++) {
        const val = await call(_, func, [this.content[i], i]);
        if (val.content) newArr.push(this.content[i]);
    }
    return new ArrayLiteral(newArr);
});
ArrayLiteral.prototype.proto.find = new NativeFunc(async function (_, property, value) {
    if (property && value) {
        value = value.content;
        for (let i = 0; i < this.content.length; i++) {
            const item = this.content[i];
            if (item.getProp(property).content === value) return item;
        }
    } else {
        for (let i = 0; i < this.content.length; i++) {
            const val = await call(_, func, [this.content[i], i]);
            if (val.content) return this.content[i];
        }
    }
    return new NullLiteral;
});
ArrayLiteral.prototype.proto.includes = new NativeFunc(async function (_, value) {
    for (let i = 0; i < this.content.length; i++) {
        const item = this.content[i];
        if (item.content === value.content) return new BooleanLiteral(true);
    }
    return new BooleanLiteral(false);
});
ArrayLiteral.prototype.proto.join = new NativeFunc(async function (_, seperator = new StringLiteral("")) {
    seperator = await seperator.getProp(new StringLiteral("toString"));
    seperator = seperator.content || "";
    let str = "";
    let i = 0;

    for (let item of this.content) {
        if (i > 0) str += seperator;
        str += (await item.getProp(new StringLiteral("toString"))).content || "";
    }
    
    return new StringLiteral(str);
});
ArrayLiteral.prototype.proto.map = new NativeFunc(async function (_, func) {
    const newArr = [];
    for (let i = 0; i < this.content.length; i++) {
        newArr.push(await call(_, func, [this.content[i], i]));
    }
    return new ArrayLiteral(newArr);
});
ArrayLiteral.prototype.proto.pop = new NativeFunc(function () {
    return this.content.pop();
});
ArrayLiteral.prototype.proto.push = new NativeFunc(function (_, ...items) {
    this.content.push(...items);
    return new NumberLiteral(this.content.length);
});
ArrayLiteral.prototype.proto.sum = new NativeFunc(async function () {
    let sum = 0;
    for (let item of this.content) {
        sum = item.content;
    }
    return new NumberLiteral(sum);
});
ArrayLiteral.prototype.proto.average = new NativeFunc(async function () {
    let sum = 0;
    for (let item of this.content) {
        sum = item.content;
    }
    return new NumberLiteral(sum / this.content.length);
});
ArrayLiteral.prototype.proto.reverse = new NativeFunc(async function () {
    return new ArrayLiteral(this.content.reverse());
});
ArrayLiteral.prototype.proto.shift = new NativeFunc(async function () {
    return this.content.shift();
});
ArrayLiteral.prototype.proto.slice = new NativeFunc(async function (_, first, length) {
    const args = [];
    if (first) args.push(first.content);
    if (length) args.push(length.content);
    return new ArrayLiteral(this.content.slice(...args));
});
ArrayLiteral.prototype.proto.every = new NativeFunc(async function (_, func) {
    for (let i = 0; i < this.content.length; i++) {
        const val = await call(_, func, [this.content[i], i]);
        if (val.content)
            return new BooleanLiteral(true);
    }
    return new BooleanLiteral(false);
});
ArrayLiteral.prototype.proto.sort = new NativeFunc(async function () {
    this.content.sort((a, b) => {
        if (a.content > b.content) {
            return 1;
        }
        if (a.content < b.content) {
            return -1;
        }
        return 0; 
    });
    return this;
});
ArrayLiteral.prototype.proto.remove = new NativeFunc(async function (_, i, amount) {
    this.content.splice(i.content, amount.content);
    return this;
});
ArrayLiteral.prototype.proto.unshift = new NativeFunc(function (_, ...items) {
    this.content.unshift(...items);
    return new NumberLiteral(this.content.length);
});

// Array.prototype.

class ObjectLiteral extends Literal {
    constructor(content = {}) {
        super(content);
        /** @type {{}} */
        this.content;
    }

    /**
     * @param {Literal} key
     */
    getProp(key) {
        if (key instanceof StringLiteral &&
            this.content[key.content] != undefined) {
            return this.content[key.content];
        }
        return super.getProp(key);
    }

    setProp(key, value) {
        if (key instanceof StringLiteral) {
            return this.content[key.content] = value;
        }
    }
}
ObjectLiteral.prototype.proto = Object.create(Literal.prototype.proto);
ObjectLiteral.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral("[Object]");
});
ObjectLiteral.prototype.proto.keys = new NativeFunc(function toString() {
    return new ArrayLiteral(
        Object.getOwnPropertyNames(this.content).map(s => new StringLiteral(s))
    );
});
ObjectLiteral.prototype.proto.size = new NativeFunc(function size() {
    return new NumberLiteral(Object.getOwnPropertyNames(this.content).length);
});

class DateObject extends NumberLiteral {
    constructor(date = new Date) {
        super();

        if (typeof date === "number") {
            this.content = date;
            this.date = new Date(date);
        } else {
            this.content = date.getTime();
            this.date = date;
        }
    }
}
DateObject.prototype.proto = Object.create(NumberLiteral.prototype.proto);
DateObject.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral(this.date.toString());
});

class Interruptor { }
class ContinueInterrupt extends Interruptor { }
class BreakInterrupt extends Interruptor { }
class ReturnInterrupt extends Interruptor {
    constructor(value = new NullLiteral) {
        super();
        this.value = value;
    }
}
class ReplyInterrupt extends Interruptor {
    constructor(value = new NullLiteral) {
        super();
        this.value = value;
    }
}

class Variable {
    /**
     * @param {number[]} statementStack
     * @param {string} varName
     * @param {any} value
     */
    constructor(statementStack, varName, value = new NullLiteral) {
        this.statementStack = statementStack;
        this.varName = varName;
        this.value = value;
    }

    /**
     * @param {Item} item 
     */
    update(item) {
        this.value = item;
        return item;
    }
}

class VariableStack extends Map {
    add(statement, name, variable) {
        if (this.has(statement)) {
            this.get(statement).set(name, variable);
        } else {
            const vars = new Map;
            vars.set(name, variable);
            this.set(statement, vars);
        }
    }

    checkVariable(name, _this) {
        for (let i = _this.statementStack.size; i > 0; i--) {
            const vars = this.get(_this.statementStack.get(i));
            if (vars) {
                const variable = vars.has(name);
                if (variable) return true;
            }
        }
        return false;
    }

    getVariable(name, _this) {
        for (let i = _this.statementStack.size - 1; i >= 0; i--) {
            const vars = this.get(_this.statementStack.get(i));
            if (vars) {
                const variable = vars.get(name);
                if (variable) return variable;
            }
        }
        return;
    }

    createVariable(name, ctx, _this) {
        if (RESERVED_KEYWORDS.includes(name)) {
            throw _this.error("Cannot create variable: '" + name + "' is a reserved keyword", ctx.Identifier);
        }
        const currentStack = _this.statementStack.clone();
        const currentStatement = currentStack.current;
        const variable = new Variable(currentStack, name);
        this.add(currentStatement, name, variable);
        return variable;
    }
}

class Member {
    constructor(parent, key, value) {
        this.parent = parent;
        this.key = key;
        this.value = value;
    }

    update(item) {
        let parent = this.parent.value instanceof Member ?
            this.parent.value :
            this.parent;
        if (typeof parent.setProp === "function") {
            parent.setProp(this.key, item);
            this.value = parent.getProp(this.key);
            return item;
        }
    }
}

module.exports = {
    RESERVED_KEYWORDS,
    toBool,
    assign,
    isReturn,
    isBreak,
    createStringLiteral,
    Item,
    Literal,
    NullLiteral,
    BooleanLiteral,
    NumberLiteral,
    StringLiteral,
    ArrayLiteral,
    ObjectLiteral,
    DateObject,
    Func,
    NativeFunc,
    Interruptor,
    ContinueInterrupt,
    BreakInterrupt,
    ReturnInterrupt,
    ReplyInterrupt,
    Variable,
    VariableStack,
    StatementStack,
    StatementManager,
    Member,
};