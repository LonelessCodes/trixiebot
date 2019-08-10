const moment = require("moment");
const Context = require("./Context");
const { StatementStack, StatementManager } = require("./StatementManager");
const regex_regex = require("../regex");

const RESERVED_KEYWORDS = [
    "func", "return", "for", "of", "while", "break", "continue", "if",
    "then", "else", "reply", "and", "or", "null", "true", "false", "sleep",
];
const FUTURE_RESERVED_KEYWORDS = [
    "import", "export",
];

/**
 * @param {Item} item
 * @returns {boolean}
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

/**
 * @param {string} str
 * @param {any} context
 * @returns {StringLiteral}
 */
function createStringLiteral(str, context) {
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
        .replace(/\\[0-7]{1,3}/g, (str, offset) => {
            // octal escape sequence
            const charCode = parseInt(str.substr(1), 8);
            if (charCode > 255) throw context.error("Constant is out of bounds", context.plus(offset));
            return String.fromCharCode(charCode);
        })
        .replace(/\\u[0-9a-fA-F]{4}/g, (str, offset) => {
            // unicode escape sequence
            const charCode = parseInt(str.substr(2), 16);
            if (charCode > 65535) throw context.error("Constant is out of bounds", context.plus(offset));
            return String.fromCharCode(charCode);
        })
        .replace(/\\/g, "");
    return new StringLiteral(str);
}

/**
 * @param {string} str
 * @param {any} context
 * @returns {RegExpLiteral}
 */
function createRegExpLiteral(str, context) {
    const [, pattern, flags = ""] = regex_regex.exec(str);
    try {
        const regex = new RegExp(pattern, flags.toLowerCase());
        return new RegExpLiteral(regex);
    } catch (err) {
        throw context.error(err.message);
    }
}

function convert(obj) {
    switch (typeof obj) {
        case "boolean":
            return new BooleanLiteral(obj);
        case "number":
            return new NumberLiteral(obj);
        case "string":
            return new StringLiteral(obj);
        case "undefined":
            return new NullLiteral;
        case "object":
            if (Array.isArray(obj)) return new ArrayLiteral(obj.map(elem => convert(elem)));
            if (Object.prototype.toString.call(obj) === "[object Object]") {
                const obj2 = {};
                for (let key in obj) {
                    obj2[key] = convert(obj[key]);
                }
                return new ObjectLiteral(obj2);
            }
            return;
        default:
            return new NullLiteral;
    }
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

    async call(context, proto_parent, args = []) {
        const interpreter = context.interpreter;

        interpreter.statementStack.pushChange(this.statementStack.clone());
        interpreter.statementStack.push(this.ctx);
        interpreter.statementStack.pushFunc(this.ctx);

        for (let i = 0; i < this.args.length; i++) {
            const variable = interpreter.varsPerStatement.createVariable(this.args[i], this.ctx, this);
            variable.update(args[i] || new NullLiteral);
        }
        const val = await interpreter.visit(this.ctx);

        interpreter.statementStack.popFunc(this.ctx);
        interpreter.statementStack.pop();
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
        } else {
            super();
        }
    }

    call(context, proto_parent, args = []) {
        return this._cb.apply(proto_parent, [context, ...args]);
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

    get native() {
        return this.content;
    }

    clone() {
        return new Literal;
    }
}
Literal.prototype.proto = Object.create({});

class NullLiteral extends Literal {
    constructor() {
        super(null);
        /** @type {null} */
        this.content;
    }

    clone() {
        return new NullLiteral;
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

    clone() {
        return new BooleanLiteral(this.content);
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

    clone() {
        return new NumberLiteral(this.content);
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

    clone() {
        return new StringLiteral(this.content);
    }

    /**
     * @param {Literal} key
     * @returns {Item}
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
StringLiteral.prototype.proto.includes = new NativeFunc(function includes(_, includes) {
    return new BooleanLiteral(this.content.includes(includes.content));
});
StringLiteral.prototype.proto.endsWith = new NativeFunc(function endsWith(_, includes) {
    return new BooleanLiteral(this.content.endsWith(includes.content));
});
StringLiteral.prototype.proto.startsWith = new NativeFunc(function startsWith(_, includes) {
    return new BooleanLiteral(this.content.startsWith(includes.content));
});
StringLiteral.prototype.proto.replace = new NativeFunc(function replace(_, includes, val) {
    if (!(includes instanceof StringLiteral) && !(includes instanceof RegExpLiteral)) throw _.error("First argument must be of either String or RegExp");
    return new StringLiteral(this.content.replace(includes.content, val.content));
});
StringLiteral.prototype.proto.slice = new NativeFunc(function slice(_, start, end) {
    return new StringLiteral(this.content.slice(start ? start.content : undefined, end ? end.content : undefined));
});
StringLiteral.prototype.proto.split = new NativeFunc(function split(_, by) {
    if (!(by instanceof StringLiteral) && !(by instanceof RegExpLiteral)) throw _.error("First argument must be of either String or RegExp");
    return new ArrayLiteral(this.content.split(by.content).map(s => new StringLiteral(s)));
});
StringLiteral.prototype.proto.toLowerCase = new NativeFunc(function toLowerCase() {
    return new StringLiteral(this.content.toLowerCase());
});
StringLiteral.prototype.proto.toUpperCase = new NativeFunc(function toUpperCase() {
    return new StringLiteral(this.content.toUpperCase());
});
StringLiteral.prototype.proto.trim = new NativeFunc(function trim() {
    return new StringLiteral(this.content.trim());
});

class RegExpLiteral extends Literal {
    constructor(content) {
        if (!content) throw new TypeError("'content' should be a RegExp");
        super(content);
        /** @type {RegExp} */
        this.content;
    }

    clone() {
        return new RegExpLiteral(this.content);
    }
}
RegExpLiteral.prototype.proto = Object.create(Literal.prototype.proto);
RegExpLiteral.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral(this.content.toString());
});
RegExpLiteral.prototype.proto.flags = new NativeFunc(function flags() {
    return new StringLiteral(this.content.flags);
});
RegExpLiteral.prototype.proto.dotAll = new NativeFunc(function dotAll() {
    return new BooleanLiteral(this.content.dotAll);
});
RegExpLiteral.prototype.proto.global = new NativeFunc(function global() {
    return new BooleanLiteral(this.content.global);
});
RegExpLiteral.prototype.proto.ignoreCase = new NativeFunc(function ignoreCase() {
    return new BooleanLiteral(this.content.ignoreCase);
});
RegExpLiteral.prototype.proto.multiline = new NativeFunc(function multiline() {
    return new BooleanLiteral(this.content.multiline);
});
RegExpLiteral.prototype.proto.source = new NativeFunc(function source() {
    return new StringLiteral(this.content.source);
});
RegExpLiteral.prototype.proto.sticky = new NativeFunc(function sticky() {
    return new BooleanLiteral(this.content.sticky);
});
RegExpLiteral.prototype.proto.unicode = new NativeFunc(function unicode() {
    return new BooleanLiteral(this.content.unicode);
});

RegExpLiteral.prototype.proto.exec = new NativeFunc(function exec(_, str) {
    if (!(str instanceof StringLiteral)) throw _.error("First argument must be a String");
    const arr = this.content.exec(str.content);
    if (!arr) return new NullLiteral;
    return new StringLiteral(new ArrayLiteral(arr.map(s => new StringLiteral(s))));
});
RegExpLiteral.prototype.proto.test = new NativeFunc(function test(_, str) {
    if (!(str instanceof StringLiteral)) throw _.error("First argument must be a String");
    return new BooleanLiteral(this.content.test(str.content));
});

class ArrayLiteral extends Literal {
    constructor(content = []) {
        super(content);
        /** @type {Item[]} */
        this.content;
    }

    clone() {
        return new ArrayLiteral(this.content);
    }

    /**
     * @param {Literal} key
     * @returns {Item}
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

    get native() {
        return this.content.map(elem => elem.native);
    }
}
ArrayLiteral.prototype.proto = Object.create(Literal.prototype.proto);
ArrayLiteral.prototype.proto.toString = new NativeFunc(async function toString(context) {
    const str = [];
    for (let elem of this.content) {
        const func = elem.getProp(new StringLiteral("toString"));
        if (func instanceof Func) str.push(await func.call(context, elem).content);
        else if (func instanceof NullLiteral) str.push("[no toString func]");
        else if (func instanceof Literal) str.push(func);
        else str.push("[no toString func]");
    }
    return new StringLiteral(str.join(", "));
});
ArrayLiteral.prototype.proto.size = new NativeFunc(function size() {
    return new NumberLiteral(this.content.length);
});

async function call(context, func, args) {
    if (func instanceof Func || func instanceof NativeFunc) {
        return assign(await func.call(context, func, args));
    } else {
        throw context.error("Cannot call value of other type than Func", context.pos);
    }
}

ArrayLiteral.prototype.proto.concat = new NativeFunc(function concat(_, ...arrs) {
    return new ArrayLiteral(this.content.concat(...arrs.map(a => a.content)));
});
ArrayLiteral.prototype.proto.fill = new NativeFunc(function fill(_, val) {
    this.content.fill(val);
    return this;
});
ArrayLiteral.prototype.proto.filter = new NativeFunc(async function filter(context, func) {
    const newArr = [];
    for (let i = 0; i < this.content.length; i++) {
        const val = await call(new Context(context.interpreter, context.args[0]), func, [this.content[i], new NumberLiteral(i)]);
        if (val.content) newArr.push(this.content[i]);
    }
    return new ArrayLiteral(newArr);
});
ArrayLiteral.prototype.proto.find = new NativeFunc(async function find(context, property, value) {
    if (property && value) {
        value = value.content;
        for (let i = 0; i < this.content.length; i++) {
            const item = this.content[i];
            if (item.getProp(property).content === value) return item;
        }
    } else {
        for (let i = 0; i < this.content.length; i++) {
            const val = await call(context, property, [this.content[i], new NumberLiteral(i)]);
            if (val.content) return this.content[i];
        }
    }
    return new NullLiteral;
});
ArrayLiteral.prototype.proto.includes = new NativeFunc(function includes(_, value) {
    for (let i = 0; i < this.content.length; i++) {
        const item = this.content[i];
        if (item.content === value.content) return new BooleanLiteral(true);
    }
    return new BooleanLiteral(false);
});
ArrayLiteral.prototype.proto.join = new NativeFunc(async function join(context, seperator = new StringLiteral("")) {
    seperator = await seperator.getProp(new StringLiteral("toString"))
        .call(new Context(context.interpreter, context.args[0]), seperator);
    seperator = seperator.content || "";
    let str = "";
    let i = 0;

    for (let item of this.content) {
        if (i > 0) str += seperator;
        str += (await item.getProp(new StringLiteral("toString")).call(context, item)).content || "";
        i++;
    }

    return new StringLiteral(str);
});
ArrayLiteral.prototype.proto.map = new NativeFunc(async function map(context, func) {
    const newArr = [];
    for (let i = 0; i < this.content.length; i++) {
        newArr.push(await call(new Context(context.interpreter, context.args[0]), func, [this.content[i], new NumberLiteral(i)]));
    }
    return new ArrayLiteral(newArr);
});
ArrayLiteral.prototype.proto.pop = new NativeFunc(function pop() {
    return this.content.pop();
});
ArrayLiteral.prototype.proto.push = new NativeFunc(function push(_, ...items) {
    this.content.push(...items);
    return new NumberLiteral(this.content.length);
});
ArrayLiteral.prototype.proto.sum = new NativeFunc(function sum() {
    let sum = 0;
    for (let item of this.content) {
        sum = item.content;
    }
    return new NumberLiteral(sum);
});
ArrayLiteral.prototype.proto.average = new NativeFunc(function average() {
    let sum = 0;
    for (let item of this.content) {
        sum = item.content;
    }
    return new NumberLiteral(sum / this.content.length);
});
ArrayLiteral.prototype.proto.reverse = new NativeFunc(function reverse() {
    return new ArrayLiteral(this.content.reverse());
});
ArrayLiteral.prototype.proto.shift = new NativeFunc(function shift() {
    return this.content.shift();
});
ArrayLiteral.prototype.proto.slice = new NativeFunc(function slice(_, first, length) {
    const args = [];
    if (first) args.push(first.content);
    if (length) args.push(length.content);
    return new ArrayLiteral(this.content.slice(...args));
});
ArrayLiteral.prototype.proto.every = new NativeFunc(async function every(context, func) {
    for (let i = 0; i < this.content.length; i++) {
        const val = await call(new Context(context.interpreter, context.args[0]), func, [this.content[i], new NumberLiteral(i)]);
        if (val.content)
            return new BooleanLiteral(true);
    }
    return new BooleanLiteral(false);
});
ArrayLiteral.prototype.proto.sort = new NativeFunc(function sort() {
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
ArrayLiteral.prototype.proto.remove = new NativeFunc(function remove(_, i, amount) {
    this.content.splice(i.content, amount.content);
    return this;
});
ArrayLiteral.prototype.proto.unshift = new NativeFunc(function unshift(_, ...items) {
    this.content.unshift(...items);
    return new NumberLiteral(this.content.length);
});
ArrayLiteral.prototype.proto.joinFrom = new NativeFunc(async function joinFrom(context, from, seperator = new StringLiteral(" ")) {
    seperator = await seperator.getProp(new StringLiteral("toString"))
        .call(new Context(context.interpreter, context.args[1]), seperator);
    seperator = seperator.content || "";
    let str = "";

    for (let i = from.content; i < this.content.length; i++) {
        let item = this.content[i];
        if (i > from.content) str += seperator;
        str += (await item.getProp(new StringLiteral("toString")).call(context, item)).content || "";
    }

    return new StringLiteral(str);
});
ArrayLiteral.prototype.proto.joinTo = new NativeFunc(async function joinTo(context, to, seperator = new StringLiteral(" ")) {
    seperator = await seperator.getProp(new StringLiteral("toString"))
        .call(new Context(context.interpreter, context.args[1]), seperator);
    seperator = seperator.content || "";
    let str = "";

    for (let i = 0; i < to.content >= 0 ? to.content : this.content.length + to.content; i++) {
        let item = this.content[i];
        if (i > 0) str += seperator;
        str += (await item.getProp(new StringLiteral("toString")).call(context, item)).content || "";
    }

    return new StringLiteral(str);
});

class ObjectLiteral extends Literal {
    constructor(content = {}) {
        super(content);
        /** @type {{}} */
        this.content;
    }

    clone() {
        return new ObjectLiteral(this.content);
    }

    /**
     * @param {Literal} key
     * @returns {Item}
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

    get native() {
        const obj = {};
        for (let key in this.content) {
            obj[key] = this.content[key].native;
        }
        return obj;
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

class TimeLiteral extends NumberLiteral {
    constructor(time = moment()) {
        super();

        if (typeof time === "number") {
            this.content = time;
            this.time = moment(time);
        } else if (moment.isMoment(time)) {
            this.content = time.valueOf();
            this.time = time;
        } else {
            this.time = moment(time);
            this.content = this.time.valueOf();
        }
    }

    clone() {
        return new TimeLiteral(this.time.clone());
    }

    add(...args) {
        if (args.length === 1 && args[0] instanceof DurationLiteral) this.time.add(args[0].duration);
        else if (args.length === 1 && args[0] instanceof NumberLiteral) this.time.add(args[0].content, "milliseconds");
        else if (args.length === 2 && args[0] instanceof NumberLiteral && args[1] instanceof StringLiteral) this.time.add(args[0].content, args[1].content);
        this.content = this.time.valueOf();
        return this;
    }

    subtract(...args) {
        if (args.length === 1 && args[0] instanceof DurationLiteral) this.time.subtract(args[0].duration);
        else if (args.length === 1 && args[0] instanceof NumberLiteral) this.time.subtract(args[0].content, "milliseconds");
        else if (args.length === 2 && args[0] instanceof NumberLiteral && args[1] instanceof StringLiteral) this.time.subtract(args[0].content, args[1].content);
        this.content = this.time.valueOf();
        return this;
    }
}
TimeLiteral.prototype.proto = Object.create(NumberLiteral.prototype.proto);
TimeLiteral.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral(this.time.toString());
});

TimeLiteral.prototype.proto.utc = new NativeFunc(function utc() {
    return new TimeLiteral(this.time.utc());
});
TimeLiteral.prototype.proto.local = new NativeFunc(function local() {
    return new TimeLiteral(this.time.local());
});
TimeLiteral.prototype.proto.isValid = new NativeFunc(function isValid() {
    return new BooleanLiteral(this.time.isValid());
});

// GETTING / SETTINGS

TimeLiteral.prototype.proto.getMilliseconds = new NativeFunc(function getMilliseconds() {
    return new NumberLiteral(this.time.milliseconds());
});
TimeLiteral.prototype.proto.setMilliseconds = new NativeFunc(function setMilliseconds(_, value) {
    if (value) this.time.milliseconds(value.content);
    return this;
});
TimeLiteral.prototype.proto.getSeconds = new NativeFunc(function getSeconds() {
    return new NumberLiteral(this.time.seconds());
});
TimeLiteral.prototype.proto.setSeconds = new NativeFunc(function setSeconds(_, value) {
    if (value) this.time.seconds(value.content);
    return this;
});
TimeLiteral.prototype.proto.getMinutes = new NativeFunc(function getMinutes() {
    return new NumberLiteral(this.time.minutes());
});
TimeLiteral.prototype.proto.setMinutes = new NativeFunc(function setMinutes(_, value) {
    if (value) this.time.minutes(value.content);
    return this;
});
TimeLiteral.prototype.proto.getHours = new NativeFunc(function getHours() {
    return new NumberLiteral(this.time.hours());
});
TimeLiteral.prototype.proto.setHours = new NativeFunc(function setHours(_, value) {
    if (value) this.time.hours(value.content);
    return this;
});
TimeLiteral.prototype.proto.getDate = new NativeFunc(function getDate() {
    return new NumberLiteral(this.time.date());
});
TimeLiteral.prototype.proto.setDate = new NativeFunc(function setDate(_, value) {
    if (value) this.time.date(value.content);
    return this;
});
TimeLiteral.prototype.proto.getDay = new NativeFunc(function getDay() {
    return new NumberLiteral(this.time.day());
});
TimeLiteral.prototype.proto.setDay = new NativeFunc(function setDay(_, value) {
    if (value) this.time.day(value.content);
    return this;
});
TimeLiteral.prototype.proto.getDayOfYear = new NativeFunc(function getDayOfYear() {
    return new NumberLiteral(this.time.dayOfYear());
});
TimeLiteral.prototype.proto.setDayOfYear = new NativeFunc(function setDayOfYear(_, value) {
    if (value) this.time.dayOfYear(value.content);
    return this;
});
TimeLiteral.prototype.proto.getWeek = new NativeFunc(function getWeek() {
    return new NumberLiteral(this.time.week());
});
TimeLiteral.prototype.proto.setWeek = new NativeFunc(function setWeek(_, value) {
    if (value) this.time.week(value.content);
    return this;
});
TimeLiteral.prototype.proto.getMonth = new NativeFunc(function getMonth() {
    return new NumberLiteral(this.time.month());
});
TimeLiteral.prototype.proto.setMonth = new NativeFunc(function setMonth(_, value) {
    if (value) this.time.month(value.content);
    return this;
});
TimeLiteral.prototype.proto.getQuarter = new NativeFunc(function getQuarter() {
    return new NumberLiteral(this.time.quarter());
});
TimeLiteral.prototype.proto.setQuarter = new NativeFunc(function setQuarter(_, value) {
    if (value) this.time.quarter(value.content);
    return this;
});
TimeLiteral.prototype.proto.getYear = new NativeFunc(function getYear() {
    return new NumberLiteral(this.time.year());
});
TimeLiteral.prototype.proto.setYear = new NativeFunc(function setYear(_, value) {
    if (value) this.time.year(value.content);
    return this;
});
TimeLiteral.prototype.proto.getWeeksInYear = new NativeFunc(function getWeeksInYear() {
    return new NumberLiteral(this.time.weeksInYear());
});
TimeLiteral.prototype.proto.getDaysInMonth = new NativeFunc(function getDaysInMonth() {
    return new NumberLiteral(this.time.daysInMonth());
});
TimeLiteral.prototype.proto.getTime = new NativeFunc(function getTime() {
    return new NumberLiteral(this.time.valueOf());
});

// MANIPULATING

TimeLiteral.prototype.proto.add = new NativeFunc(function add(_, ...args) {
    this.add(...args);
    return this;
});
TimeLiteral.prototype.proto.subtract = new NativeFunc(function subtract(_, ...args) {
    this.subtract(...args);
    return this;
});
TimeLiteral.prototype.proto.startOf = new NativeFunc(function startOf(_, str) {
    if (str instanceof StringLiteral) this.time.startOf(str.content);
    return this;
});
TimeLiteral.prototype.proto.endOf = new NativeFunc(function endOf(_, str) {
    if (str instanceof StringLiteral) this.time.endOf(str.content);
    return this;
});
TimeLiteral.prototype.proto.setZone = new NativeFunc(function setZone(_, offset) {
    if (offset instanceof NumberLiteral || offset instanceof StringLiteral) this.time.utcOffset(offset.content);
    return this;
});
TimeLiteral.prototype.proto.getZone = new NativeFunc(function getZone() {
    return new NumberLiteral(this.time.utcOffset());
});

// DISPLAY

TimeLiteral.prototype.proto.format = new NativeFunc(function format(_, str) {
    if (str instanceof StringLiteral) return new StringLiteral(this.time.format(str.content));
    return new StringLiteral(this.time.format());
});
TimeLiteral.prototype.proto.humanize = new NativeFunc(function humanize() {
    return new StringLiteral(this.time.format("MMMM Do YYYY, h:mm:ss A"));
});
TimeLiteral.prototype.proto.fromNow = new NativeFunc(function fromNow(_, postfix) {
    return new StringLiteral(this.time.fromNow(!!postfix));
});
TimeLiteral.prototype.proto.from = new NativeFunc(function from(context, time, postfix) {
    if (!(time instanceof TimeLiteral)) throw context.error("First parameter should be a Time object", context.args[0]);
    return new StringLiteral(this.time.from(time.time, !!postfix));
});
TimeLiteral.prototype.proto.toNow = new NativeFunc(function toNow(_, postfix) {
    return new StringLiteral(this.time.toNow(!!postfix));
});
TimeLiteral.prototype.proto.to = new NativeFunc(function to(context, time, postfix) {
    if (!(time instanceof TimeLiteral)) throw context.error("First parameter should be a Time object", context.args[0]);
    return new StringLiteral(this.time.to(time.time, !!postfix));
});

TimeLiteral.prototype.proto.toISOString = new NativeFunc(function toISOString() {
    return new StringLiteral(this.time.toISOString());
});

// DIFFERENCE

TimeLiteral.prototype.proto.diff = new NativeFunc(function diff(context, time) {
    if (!(time instanceof TimeLiteral)) throw context.error("First parameter should be a Time object", context.args[0]);
    return new DurationLiteral(moment.duration(this.time.diff(time.time)));
});

// QUERY

TimeLiteral.prototype.proto.isBefore = new NativeFunc(function isBefore(context, time, scope) {
    if (!(time instanceof TimeLiteral)) throw context.error("First parameter should be a Time object", context.args[0]);
    if (scope instanceof StringLiteral) return new BooleanLiteral(this.time.isBefore(time.time, scope.content));
    return new BooleanLiteral(this.time.isBefore(time.time));
});
TimeLiteral.prototype.proto.isSame = new NativeFunc(function isSame(context, time, scope) {
    if (!(time instanceof TimeLiteral)) throw context.error("First parameter should be a Time object", context.args[0]);
    if (scope instanceof StringLiteral) return new BooleanLiteral(this.time.isSame(time.time, scope.content));
    return new BooleanLiteral(this.time.isSame(time.time));
});
TimeLiteral.prototype.proto.isAfter = new NativeFunc(function isAfter(context, time, scope) {
    if (!(time instanceof TimeLiteral)) throw context.error("First parameter should be a Time object", context.args[0]);
    if (scope instanceof StringLiteral) return new BooleanLiteral(this.time.isAfter(time.time, scope.content));
    return new BooleanLiteral(this.time.isAfter(time.time));
});
TimeLiteral.prototype.proto.isSameOrBefore = new NativeFunc(function isSameOrBefore(context, time, scope) {
    if (!(time instanceof TimeLiteral)) throw context.error("First parameter should be a Time object", context.args[0]);
    if (scope instanceof StringLiteral) return new BooleanLiteral(this.time.isSameOrBefore(time.time, scope.content));
    return new BooleanLiteral(this.time.isSameOrBefore(time.time));
});
TimeLiteral.prototype.proto.isSameOrAfter = new NativeFunc(function isSameOrAfter(context, time, scope) {
    if (!(time instanceof TimeLiteral)) throw context.error("First parameter should be a Time object", context.args[0]);
    if (scope instanceof StringLiteral) return new BooleanLiteral(this.time.isSameOrAfter(time.time, scope.content));
    return new BooleanLiteral(this.time.isSameOrAfter(time.time));
});
TimeLiteral.prototype.proto.isBetween = new NativeFunc(function isBetween(context, after, before, scope, inclusivity) {
    if (!(after instanceof TimeLiteral)) throw context.error("First parameter should be a Time object", context.args[0]);
    if (!(before instanceof TimeLiteral)) throw context.error("Second parameter should be a Time object", context.args[1]);
    if (scope instanceof StringLiteral) {
        if (inclusivity instanceof StringLiteral) return new BooleanLiteral(this.time.isBetween(after.time, before.time, scope.content, inclusivity.content));
        return new BooleanLiteral(this.time.isBetween(after.time, before.time, scope.content));
    }
    return new BooleanLiteral(this.time.isBetween(after.time, before.time));
});
TimeLiteral.prototype.proto.isDST = new NativeFunc(function isDST() {
    return new BooleanLiteral(this.time.isDST());
});
TimeLiteral.prototype.proto.isLeapYear = new NativeFunc(function isLeapYear() {
    return new BooleanLiteral(this.time.isLeapYear());
});

// ------------- DURATION ---------------

class DurationLiteral extends NumberLiteral {
    constructor(duration = moment.duration()) {
        super();

        if (typeof duration === "number") {
            this.content = duration;
            this.duration = moment.duration(duration);
        } else if (moment.isDuration(duration)) {
            this.content = duration.valueOf();
            this.duration = duration;
        } else {
            this.duration = moment.duration(duration);
            this.content = this.duration.valueOf();
        }
    }

    clone() {
        return new DurationLiteral(this.duration.clone());
    }

    add(...args) {
        if (args.length === 1 && args[0] instanceof DurationLiteral) this.duration.add(args[0].duration);
        else if (args.length === 1 && args[0] instanceof NumberLiteral) this.duration.add(args[0].content, "milliseconds");
        else if (args.length === 2 && args[0] instanceof NumberLiteral && args[1] instanceof StringLiteral) this.duration.add(args[0].content, args[1].content);
        this.content = this.duration.valueOf();
        return this;
    }

    subtract(...args) {
        if (args.length === 1 && args[0] instanceof DurationLiteral) this.duration.subtract(args[0].duration);
        else if (args.length === 1 && args[0] instanceof NumberLiteral) this.duration.subtract(args[0].content, "milliseconds");
        else if (args.length === 2 && args[0] instanceof NumberLiteral && args[1] instanceof StringLiteral) this.duration.subtract(args[0].content, args[1].content);
        this.content = this.duration.valueOf();
        return this;
    }

    multiply(factor) {
        if (!(factor instanceof NumberLiteral)) return;
        this.duration = moment.duration(Math.floor(this.content * factor.content));
        this.content = this.duration.valueOf();
        return this;
    }
}
DurationLiteral.prototype.proto = Object.create(NumberLiteral.prototype.proto);
DurationLiteral.prototype.proto.toString = new NativeFunc(function toString() {
    return new StringLiteral(this.duration.humanize(false));
});

DurationLiteral.prototype.proto.humanize = new NativeFunc(function humanize(_, suffix) {
    return new StringLiteral(this.duration.humanize(!!suffix));
});
DurationLiteral.prototype.proto.getMilliseconds = new NativeFunc(function getMilliseconds() {
    return new NumberLiteral(this.duration.milliseconds());
});
DurationLiteral.prototype.proto.asMilliseconds = new NativeFunc(function asMilliseconds() {
    return new NumberLiteral(this.duration.asMilliseconds());
});
DurationLiteral.prototype.proto.getSeconds = new NativeFunc(function getSeconds() {
    return new NumberLiteral(this.duration.seconds());
});
DurationLiteral.prototype.proto.asSeconds = new NativeFunc(function asSeconds() {
    return new NumberLiteral(this.duration.asSeconds());
});
DurationLiteral.prototype.proto.getMinutes = new NativeFunc(function getMinutes() {
    return new NumberLiteral(this.duration.minutes());
});
DurationLiteral.prototype.proto.asMinutes = new NativeFunc(function asMinutes() {
    return new NumberLiteral(this.duration.asMinutes());
});
DurationLiteral.prototype.proto.getHours = new NativeFunc(function getHours() {
    return new NumberLiteral(this.duration.hours());
});
DurationLiteral.prototype.proto.asHours = new NativeFunc(function asHours() {
    return new NumberLiteral(this.duration.asHours());
});
DurationLiteral.prototype.proto.getDays = new NativeFunc(function getDays() {
    return new NumberLiteral(this.duration.days());
});
DurationLiteral.prototype.proto.asDays = new NativeFunc(function asDays() {
    return new NumberLiteral(this.duration.asDays());
});
DurationLiteral.prototype.proto.getWeeks = new NativeFunc(function getWeeks() {
    return new NumberLiteral(this.duration.weeks());
});
DurationLiteral.prototype.proto.asWeeks = new NativeFunc(function asWeeks() {
    return new NumberLiteral(this.duration.asWeeks());
});
DurationLiteral.prototype.proto.getMonths = new NativeFunc(function getMonths() {
    return new NumberLiteral(this.duration.months());
});
DurationLiteral.prototype.proto.asMonths = new NativeFunc(function asMonths() {
    return new NumberLiteral(this.duration.asMonths());
});
DurationLiteral.prototype.proto.getYears = new NativeFunc(function getYears() {
    return new NumberLiteral(this.duration.years());
});
DurationLiteral.prototype.proto.asYears = new NativeFunc(function asYears() {
    return new NumberLiteral(this.duration.asYears());
});


DurationLiteral.prototype.proto.toISOString = new NativeFunc(function toISOString() {
    return new StringLiteral(this.duration.toISOString());
});

// MANIPULATION

DurationLiteral.prototype.proto.add = new NativeFunc(function add(_, ...args) {
    this.add(...args);
    return this;
});
DurationLiteral.prototype.proto.subtract = new NativeFunc(function subtract(_, ...args) {
    this.subtract(...args);
    return this;
});
DurationLiteral.prototype.proto.multiply = new NativeFunc(function multiply(_, factor) {
    this.multiply(factor);
    return this;
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
     * @returns {Item}
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
    }

    createVariable(name, ctx, _this) {
        if (RESERVED_KEYWORDS.includes(name)) {
            throw _this.error("Cannot create variable: '" + name + "' is a reserved keyword", ctx.Identifier);
        }
        if (FUTURE_RESERVED_KEYWORDS.includes(name)) {
            throw _this.error("Cannot create variable: '" + name + "' is a future reserved keyword", ctx.Identifier);
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
    FUTURE_RESERVED_KEYWORDS,
    toBool,
    assign,
    isReturn,
    isBreak,
    createStringLiteral,
    createRegExpLiteral,
    Item,
    Func,
    NativeFunc,
    Literal,
    NullLiteral,
    BooleanLiteral,
    NumberLiteral,
    StringLiteral,
    RegExpLiteral,
    ArrayLiteral,
    ObjectLiteral,
    TimeLiteral,
    DurationLiteral,
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
    convert,
};
