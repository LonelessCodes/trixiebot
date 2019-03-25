const c = require("./classes");

// Literal Functions

const Boolean = new c.NativeFunc(function (_, arg0) {
    if (arg0 instanceof c.NumberLiteral) {
        return new c.BooleanLiteral(arg0.content > 0 ? true : false);
    }
    if (arg0 instanceof c.StringLiteral) {
        return new c.BooleanLiteral(arg0.content === "true" ? true : false);
    }
    return new c.BooleanLiteral(!!arg0.content);
});

const Number = new c.NativeFunc(function (_, arg0) {
    if (arg0 instanceof c.BooleanLiteral) {
        return new c.NumberLiteral(arg0.content ? 1 : 0);
    }
    if (arg0 instanceof c.NumberLiteral) {
        return new c.NumberLiteral(new global.Number(arg0.content));
    }
    if (arg0 instanceof c.StringLiteral) {
        return new c.NumberLiteral(new global.Number(arg0.content));
    }
    return new c.NumberLiteral(arg0 ? global.NaN : 0);
});

const String = new c.NativeFunc(function (_, arg0) {
    return new StringLiteral(new global.String(arg0.content));
});

const Array = new c.NativeFunc(function (_, arg0) {
    if (arg0 instanceof c.NumberLiteral) {
        return new c.ArrayLiteral(new global.Array(arg0.content));
    }
    return new c.ArrayLiteral([]);
});

const Object = new c.NativeFunc(function (_, arg0) {
    if (arg0 instanceof c.ObjectLiteral) {
        return new c.ObjectLiteral(new global.Object(arg0.content));
    }
    return new c.ObjectLiteral({});
});

// Number stuff

const MAX_SAFE_INTEGER = new c.NumberLiteral(global.Number.MAX_SAFE_INTEGER);
const NaN = new c.NumberLiteral(global.NaN);
const Infinity = new c.NumberLiteral(global.Infinity);
const isNaN = new c.NativeFunc(function (_, number) {
    return new c.BooleanLiteral(global.isNaN(number.content));
});
const isFinite = new c.NativeFunc(function (_, number) {
    return new c.BooleanLiteral(global.isFinite(number.content));
});
const parseNumber = new c.NativeFunc(function (_, string) {
    return new c.NumberLiteral(
        string instanceof classese.StringLiteral ?
            global.parseFloat(string.content) :
            global.NaN
    );
});
const floor = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.floor(num.content) );
});
const ceil = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.ceil(num.content));
});
const round = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.round(num.content));
});
const sqrt = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.sqrt(num.content));
});

// Time stuff

const Date = new c.NativeFunc(function () {
    return new c.DateObject(new global.Date());
});
const now = new c.NativeFunc(function () {
    return new c.NumberLiteral(global.Date.now());
});

const random = new c.NativeFunc(function (_, ...args) {
    const random = (start, end) => Math.random() * (end - start) + start;

    if (args.length === 0) {
        return new c.NumberLiteral(random(0, 1));
    } else if (args.length === 1) {
        if (args[0] instanceof c.NumberLiteral) {
            return new c.NumberLiteral(random(0, args[0].content));
        } else if (args[0] instanceof c.ArrayLiteral) {
            return args[0].content[Math.floor(random(0, args[0].content.length))];
        } else {
            return new c.NumberLiteral(random(0, 1));
        }
    } else if (args.length >= 2) {
        return new c.NumberLiteral(args[0].content === args[1].content ? args[0].content : random(args[0].content, args[1].content));
    }
});

const RichEmbed = new c.NativeFunc(async function () {
    return await c.RichEmbed();
});
const Emoji = new c.NativeFunc(async function (interpreter, id) {
    if (id instanceof c.StringLiteral)
        return await c.Emoji(interpreter, id);
    return new c.NullLiteral;
});
const Message = new c.NativeFunc(async function (interpreter, id) {
    if (id instanceof c.StringLiteral)
        return await c.Message(interpreter, id);
    return new c.NullLiteral;
});
const Role = new c.NativeFunc(async function (interpreter, id) {
    if (id instanceof c.StringLiteral)
        return await c.Role(interpreter, id);
    return new c.NullLiteral;
});
const Member = new c.NativeFunc(async function (interpreter, id) {
    if (id instanceof c.StringLiteral)
        return await c.GuildMember(interpreter, id);
    return new c.NullLiteral;
});
const Channel = new c.NativeFunc(async function (interpreter, id) {
    if (id instanceof c.StringLiteral)
        return await c.Channel(interpreter, id);
    return new c.NullLiteral;
});

module.exports = {
    Boolean,
    Number,
    String,
    Array,
    Object,

    MAX_SAFE_INTEGER,
    NaN,
    Infinity,
    isNaN,
    isFinite,
    parseNumber,
    floor,
    ceil,
    round,
    sqrt,

    Date,
    now,
    random,
    RichEmbed,

    Emoji,
    Message,
    Role,
    Member,
    Channel,    
};