const _log = require("../../../../modules/log");
const { parseHumanTime: _parseHumanTime, toHumanTime: _toHumanTime } = require("../../../../modules/util/time");
const c = require("./classes");
const moment = require("moment");
const database = require("../../../../modules/getDatabase")()
    .then(client => client.collection("cc_storage"))
    .catch(err => {
        _log.error(err);
        process.exit();
    });
const BSON = require("bson");

const VERSION = new c.StringLiteral("1");

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
const MIN_SAFE_INTEGER = new c.NumberLiteral(global.Number.MIN_SAFE_INTEGER);
const MIN_SAFE_DIFFERENCE = new c.NumberLiteral(global.Number.EPSILON);
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
const E = new c.NumberLiteral(global.Math.E);
const LN2 = new c.NumberLiteral(global.Math.LN2);
const LN10 = new c.NumberLiteral(global.Math.LN10);
const LOG2E = new c.NumberLiteral(global.Math.LOG2E);
const LOG10E = new c.NumberLiteral(global.Math.LOG10E);
const SQRT1_2 = new c.NumberLiteral(global.Math.SQRT1_2);
const SQRT2 = new c.NumberLiteral(global.Math.SQRT2);
const PI = new c.NumberLiteral(global.Math.PI);
const floor = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.floor(num.content) );
});
const ceil = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.ceil(num.content));
});
const round = new c.NativeFunc(function (_, num, precision) {
    if (!(num instanceof c.NumberLiteral)) return new c.NumberLiteral(NaN);
    if (precision) {
        precision = Math.pow(10, precision.content);
        return new c.NumberLiteral(Math.round(num.content * precision) / precision);
    }
    return new c.NumberLiteral(Math.round(num.content));
});
const exp = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.exp(num.content));
});
const abs = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.abs(num.content));
});
const acos = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.acos(num.content));
});
const cos = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.cos(num.content));
});
const cosh = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.cosh(num.content));
});
const acosh = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.acosh(num.content));
});
const asin = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.asin(num.content));
});
const sin = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.sin(num.content));
});
const sinh = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.sinh(num.content));
});
const asinh = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.asinh(num.content));
});
const atan = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.atan(num.content));
});
const tan = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.tan(num.content));
});
const tanh = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.tanh(num.content));
});
const atanh = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.atanh(num.content));
});
const atan2 = new c.NativeFunc(function (_, x, y) {
    return new c.NumberLiteral(Math.atan2(x.content, y.content));
});
const cbrt = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.cbrt(num.content));
});
const sqrt = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.sqrt(num.content));
});
const hypot = new c.NativeFunc(function (_, ...args) {
    return new c.NumberLiteral(Math.hypot(...args.map(aaaaa => aaaaa.content)));
});
const log = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.log(num.content));
});
const log10 = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.log10(num.content));
});
const log2 = new c.NativeFunc(function (_, num) {
    return new c.NumberLiteral(Math.log2(num.content));
});
const max = new c.NativeFunc(function (_, ...args) {
    args = args.sort((a, b) => {
        if (a.content > b.content) {
            return 1;
        }
        if (a.content < b.content) {
            return -1;
        }
        return 0;
    });
    return args[0];
});
const min = new c.NativeFunc(function (_, ...args) {
    args = args.sort((a, b) => {
        if (a.content < b.content) {
            return 1;
        }
        if (a.content > b.content) {
            return -1;
        }
        return 0;
    });
    return args[0];
});

// Time stuff

const Time = new c.NativeFunc(function (_, ...args) {
    if (args.length === 0) return new c.TimeLiteral();
    else if (args.length === 1 && args[0] instanceof c.TimeLiteral) return new c.TimeLiteral(args[0].time.clone());
    else if (args.length === 1 && args[0] instanceof c.NullLiteral) return new c.TimeLiteral(moment(undefined));
    else if (args.length === 1 && args[0] instanceof c.NumberLiteral) return new c.TimeLiteral(moment(args[0].content));
    else if (args.length === 1 && args[0] instanceof c.StringLiteral) return new c.TimeLiteral(moment(args[0].content));
    else if (args.length === 1 && args[0] instanceof c.ArrayLiteral) return new c.TimeLiteral(moment(args[0].content.map(elem => elem.content)));
    else if (args.length === 2 && args[0] instanceof c.StringLiteral && args[1] instanceof c.StringLiteral) return new c.TimeLiteral(moment(args[0].content, args[1].content));
    else if (args.length === 2 && args[0] instanceof c.StringLiteral && args[1] instanceof c.ArrayLiteral) return new c.TimeLiteral(moment(args[0].content, args[1].content.map(elem => elem.content)));
    else return new c.TimeLiteral();
});
const now = new c.NativeFunc(function () {
    return new c.NumberLiteral(moment.now());
});
const Duration = new c.NativeFunc(function (_, ...args) {
    if (args.length === 0) return new c.DurationLiteral();
    else if (args.length === 1 && args[0] instanceof c.DurationLiteral) return new c.DurationLiteral(args[0].duration.clone());
    else if (args.length === 1 && args[0] instanceof c.NumberLiteral) return new c.DurationLiteral(moment.duration(args[0].content));
    else if (args.length === 1 && args[0] instanceof c.StringLiteral) return new c.DurationLiteral(moment.duration(args[0].content));
    else if (args.length === 2 && args[0] instanceof c.NumberLiteral && args[1] instanceof c.StringLiteral) return new c.DurationLiteral(moment.duration(args[0].content, args[1].content));
    else return new c.DurationLiteral();
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

// storage

const storage = new c.NativeFunc(function (interpreter, storageId) {
    if (!(storageId instanceof c.StringLiteral)) return new c.NullLiteral;

    storageId = storageId.content;

    return new c.ObjectLiteral({
        get: new c.NativeFunc("get", async function (_, key) {
            if (!(key instanceof c.NumberLiteral || key instanceof c.StringLiteral)) return new c.NullLiteral;
            key = key.native;

            const data = await database.then(db => db.findOne({ guildId: interpreter.guildId, storageId }));
            if (!data) return new c.NullLiteral;

            const value = c.convert(data.data[key]);
            return value;
        }),
        set: new c.NativeFunc("set", async function (_, key, value) {
            if (!(key instanceof c.NumberLiteral || key instanceof c.StringLiteral)) throw interpreter.error("A storage key may only be a String or a Number");
            key = key.native;
            
            if (!(value instanceof c.Literal)) throw interpreter.error("A storage value can only be a literal, not a func");
            value = value.native;

            // calculate doc size
            const cursor = await database
                .then(db => db.find({ guildId: interpreter.guildId }).toArray());
            const relevantDocs = [];
            for (let doc of cursor) relevantDocs.push({ storageId: doc.storageId, data: doc.data });
            const storageDoc = relevantDocs.find(doc => doc.storageId === storageId);
            if (storageDoc) storageDoc.data[key] = value;
            else relevantDocs.push({ storageId: storageId, data: { [key]: value } });

            let docsSize = 0;
            for (let doc of relevantDocs) docsSize += BSON.calculateObjectSize(doc);

            if (docsSize > 1024 * 500) {
                throw interpreter.error("Storage per guild cannot exceed 500kb!");
            }

            await database.then(db => db.updateOne({ guildId: interpreter.guildId, storageId }, { $set: { [`data.${key}`]: value } }, { upsert: true }));

            return value;
        }),
        delete: new c.NativeFunc("delete", async function (_, key) {
            if (!(key instanceof c.NumberLiteral || key instanceof c.StringLiteral)) return new c.BooleanLiteral(false);
            key = key.native;

            await database.then(db => db.updateOne({ guildId: interpreter.guildId, storageId }, { $unset: { [`data.${key}`]: "" } }));

            return new c.BooleanLiteral(true);
        }),
        keys: new c.NativeFunc("keys", async function (_) {
            const data = await database.then(db => db.findOne({ guildId: interpreter.guildId, storageId }));
            return Object.keys(data.data).map(s => new c.StringLiteral(s));
        }),
        all: new c.NativeFunc("all", async function (_) {
            const data = await database.then(db => db.findOne({ guildId: interpreter.guildId, storageId }));
            return c.convert(data.data);
        })
    });
});

const pad = new c.NativeFunc("pad", function (_, value, width, fill = new c.StringLiteral("0")) {
    if (!(width instanceof c.NumberLiteral)) throw _.error("parameter >length< must be a Number");

    width = width.content;
    value = value.getProp(new c.StringLiteral("toString")).call(_, value).content;
    fill = fill.getProp(new c.StringLiteral("toString")).call(_, fill).content;

    const str = value.length >= width ? value : new global.Array(width - value.length + 1).join(fill) + value;
    
    return new c.StringLiteral(str);
});

const parseHumanTime = new c.NativeFunc("parseHumanTime", function (_, str) {
    if (!(str instanceof c.StringLiteral)) return new c.NumberLiteral(NaN);
    return new c.DurationLiteral(moment.duration(_parseHumanTime(str.content), "milliseconds"));
});
const toHumanTime = new c.NativeFunc("toHumanTime", function (_, num) {
    if (!(num instanceof c.NumberLiteral || num instanceof c.DurationLiteral)) return new c.StringLiteral("");
    return new c.StringLiteral(_toHumanTime(num.content));
});

const since = new c.NativeFunc("since", function (_, time) {
    if (!(time instanceof c.TimeLiteral)) return new c.DurationLiteral();
    return new c.DurationLiteral(moment.duration(time.time.diff(moment())));
});
const until = new c.NativeFunc("until", function (_, time) {
    if (!(time instanceof c.TimeLiteral)) return new c.DurationLiteral();
    return new c.DurationLiteral(moment.duration(moment().diff(time.time)));
});

const MILLISECOND = new c.NumberLiteral(1);
const SECOND = new c.NumberLiteral(1000 * MILLISECOND.content);
const MINUTE = new c.NumberLiteral(60 * SECOND.content);
const HOUR = new c.NumberLiteral(60 * MINUTE.content);
const DAY = new c.NumberLiteral(24 * HOUR.content);

module.exports = {
    VERSION,

    Boolean,
    Number,
    String,
    Array,
    Object,

    MAX_SAFE_INTEGER,
    MIN_SAFE_INTEGER,
    MIN_SAFE_DIFFERENCE,
    NaN,
    Infinity,
    isNaN,
    isFinite,
    parseNumber,

    E, LN2, LN10, LOG2E, LOG10E, SQRT1_2, SQRT2, PI, 

    floor,
    ceil,
    round,

    exp, abs, acos, cos, acosh, cosh, asin, sin, asinh, sinh, atan, tan, atanh, tanh, atan2,
    cbrt, sqrt, hypot, log, log10, log2, max, min, 

    Time,
    now,
    Duration,
    random,
    RichEmbed,

    Emoji,
    Message,
    Role,
    Member,
    Channel,

    storage,
    pad,

    parseHumanTime,
    toHumanTime,

    since, until,

    MILLISECOND, SECOND, MINUTE, HOUR, DAY
};