const { log: _log } = require("../util");
const { parseHumanTime: _parseHumanTime, toHumanTime: _toHumanTime } = require("../../../../util/time");
const Context = require("./Context");
const c = require("./classes");
const moment = require("moment");
const database = require("../../../../modules/db/database")()
    .then(client => client.collection("cc_storage"))
    .catch(err => {
        _log.error(err);
        process.exit();
    });
const BSON = require("bson");

const VERSION = new c.StringLiteral("1.1.0");

// Literal Functions

const Boolean = new c.NativeFunc(function boolean(_, arg0) {
    if (arg0 instanceof c.NumberLiteral) {
        return new c.BooleanLiteral(arg0.content !== 0);
    }
    if (arg0 instanceof c.StringLiteral) {
        return new c.BooleanLiteral(arg0.content === "true");
    }
    return new c.BooleanLiteral(!!arg0.content);
});

const Number = new c.NativeFunc(function number(_, arg0) {
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

const String = new c.NativeFunc(function string(_, arg0) {
    return new c.StringLiteral(new global.String(arg0 ? arg0.content : ""));
});

const RegExp = new c.NativeFunc(function regexp(_, pattern, flags = new c.StringLiteral("")) {
    try {
        const regex = new global.RegExp(pattern.content, flags.content.toLowerCase());
        return new c.RegExpLiteral(regex);
    } catch (err) {
        throw _.error(err.message);
    }
});

const Array = new c.NativeFunc(function array(_, arg0) {
    if (arg0 instanceof c.NumberLiteral) {
        return new c.ArrayLiteral(new global.Array(arg0.content));
    }
    return new c.ArrayLiteral([]);
});

const Object = new c.NativeFunc(function object() {
    return new c.ObjectLiteral({});
});

// Number stuff

const MAX_SAFE_INTEGER = new c.NumberLiteral(global.Number.MAX_SAFE_INTEGER);
const MIN_SAFE_INTEGER = new c.NumberLiteral(global.Number.MIN_SAFE_INTEGER);
const MIN_SAFE_DIFFERENCE = new c.NumberLiteral(global.Number.EPSILON);
const N_NaN = new c.NumberLiteral(global.NaN);
const N_Infinity = new c.NumberLiteral(global.Infinity);
const isNaN = new c.NativeFunc(function isNaN(_, number) {
    return new c.BooleanLiteral(global.isNaN(number.content));
});
const isFinite = new c.NativeFunc(function isFinite(_, number) {
    return new c.BooleanLiteral(global.isFinite(number.content));
});
const parseNumber = new c.NativeFunc(function parseNumber(_, string, radix) {
    if (!radix || !(radix instanceof c.NumberLiteral)) {
        return new c.NumberLiteral(
            string instanceof c.StringLiteral ?
                global.parseFloat(string.content) :
                global.NaN
        );
    } else {
        if (!(radix.content >= 2 && radix.content <= 36)) throw _.error("Radix argument must be between 2 and 36", _.args[1]);
        return new c.NumberLiteral(
            string instanceof c.StringLiteral ?
                global.parseInt(string.content, radix.content) :
                global.NaN
        );
    }
});
const E = new c.NumberLiteral(global.Math.E);
const LN2 = new c.NumberLiteral(global.Math.LN2);
const LN10 = new c.NumberLiteral(global.Math.LN10);
const LOG2E = new c.NumberLiteral(global.Math.LOG2E);
const LOG10E = new c.NumberLiteral(global.Math.LOG10E);
const SQRT1_2 = new c.NumberLiteral(global.Math.SQRT1_2);
const SQRT2 = new c.NumberLiteral(global.Math.SQRT2);
const PI = new c.NumberLiteral(global.Math.PI);
const floor = new c.NativeFunc(function floor(_, num) {
    return new c.NumberLiteral(Math.floor(num.content));
});
const ceil = new c.NativeFunc(function ceil(_, num) {
    return new c.NumberLiteral(Math.ceil(num.content));
});
const round = new c.NativeFunc(function round(_, num, precision) {
    if (!(num instanceof c.NumberLiteral)) return new c.NumberLiteral(N_NaN);
    if (precision) {
        precision = Math.pow(10, precision.content);
        return new c.NumberLiteral(Math.round(num.content * precision) / precision);
    }
    return new c.NumberLiteral(Math.round(num.content));
});
const exp = new c.NativeFunc(function exp(_, num) {
    return new c.NumberLiteral(Math.exp(num.content));
});
const abs = new c.NativeFunc(function abs(_, num) {
    return new c.NumberLiteral(Math.abs(num.content));
});
const acos = new c.NativeFunc(function acos(_, num) {
    return new c.NumberLiteral(Math.acos(num.content));
});
const cos = new c.NativeFunc(function cos(_, num) {
    return new c.NumberLiteral(Math.cos(num.content));
});
const cosh = new c.NativeFunc(function cosh(_, num) {
    return new c.NumberLiteral(Math.cosh(num.content));
});
const acosh = new c.NativeFunc(function acosh(_, num) {
    return new c.NumberLiteral(Math.acosh(num.content));
});
const asin = new c.NativeFunc(function asin(_, num) {
    return new c.NumberLiteral(Math.asin(num.content));
});
const sin = new c.NativeFunc(function sin(_, num) {
    return new c.NumberLiteral(Math.sin(num.content));
});
const sinh = new c.NativeFunc(function sinh(_, num) {
    return new c.NumberLiteral(Math.sinh(num.content));
});
const asinh = new c.NativeFunc(function asinh(_, num) {
    return new c.NumberLiteral(Math.asinh(num.content));
});
const atan = new c.NativeFunc(function atan(_, num) {
    return new c.NumberLiteral(Math.atan(num.content));
});
const tan = new c.NativeFunc(function tan(_, num) {
    return new c.NumberLiteral(Math.tan(num.content));
});
const tanh = new c.NativeFunc(function tanh(_, num) {
    return new c.NumberLiteral(Math.tanh(num.content));
});
const atanh = new c.NativeFunc(function atanh(_, num) {
    return new c.NumberLiteral(Math.atanh(num.content));
});
const atan2 = new c.NativeFunc(function atan2(_, x, y) {
    return new c.NumberLiteral(Math.atan2(x.content, y.content));
});
const cbrt = new c.NativeFunc(function cbrt(_, num) {
    return new c.NumberLiteral(Math.cbrt(num.content));
});
const sqrt = new c.NativeFunc(function sqrt(_, num) {
    return new c.NumberLiteral(Math.sqrt(num.content));
});
const hypot = new c.NativeFunc(function hypot(_, ...args) {
    return new c.NumberLiteral(Math.hypot(...args.map(aaaaa => aaaaa.content)));
});
const log = new c.NativeFunc(function log(_, num) {
    return new c.NumberLiteral(Math.log(num.content));
});
const log10 = new c.NativeFunc(function log10(_, num) {
    return new c.NumberLiteral(Math.log10(num.content));
});
const log2 = new c.NativeFunc(function log2(_, num) {
    return new c.NumberLiteral(Math.log2(num.content));
});
const max = new c.NativeFunc(function max(_, ...args) {
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
const min = new c.NativeFunc(function min(_, ...args) {
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

const Time = new c.NativeFunc(function time(_, ...args) {
    if (args.length === 0) return new c.TimeLiteral();
    else if (args.length === 1 && args[0] instanceof c.TimeLiteral)
        return new c.TimeLiteral(args[0].time.clone());
    else if (args.length === 1 && args[0] instanceof c.NullLiteral)
        return new c.TimeLiteral(moment(undefined));
    else if (args.length === 1 && args[0] instanceof c.NumberLiteral)
        return new c.TimeLiteral(moment(args[0].content));
    else if (args.length === 1 && args[0] instanceof c.StringLiteral)
        return new c.TimeLiteral(moment(args[0].content));
    else if (args.length === 1 && args[0] instanceof c.ArrayLiteral)
        return new c.TimeLiteral(moment(args[0].content.map(elem => elem.content)));
    else if (args.length === 2 && args[0] instanceof c.StringLiteral && args[1] instanceof c.StringLiteral)
        return new c.TimeLiteral(moment(args[0].content, args[1].content));
    else if (args.length === 2 && args[0] instanceof c.StringLiteral && args[1] instanceof c.ArrayLiteral)
        return new c.TimeLiteral(moment(args[0].content, args[1].content.map(elem => elem.content)));
    else return new c.TimeLiteral();
});
const now = new c.NativeFunc(function now() {
    return new c.NumberLiteral(moment.now());
});
const Duration = new c.NativeFunc(function duration(_, ...args) {
    if (args.length === 0) return new c.DurationLiteral();
    else if (args.length === 1 && args[0] instanceof c.DurationLiteral)
        return new c.DurationLiteral(args[0].duration.clone());
    else if (args.length === 1 && args[0] instanceof c.NumberLiteral)
        return new c.DurationLiteral(moment.duration(args[0].content));
    else if (args.length === 1 && args[0] instanceof c.StringLiteral)
        return new c.DurationLiteral(moment.duration(args[0].content));
    else if (args.length === 2 && args[0] instanceof c.NumberLiteral && args[1] instanceof c.StringLiteral)
        return new c.DurationLiteral(moment.duration(args[0].content, args[1].content));
    else return new c.DurationLiteral();
});

const random = new c.NativeFunc(function random(_, ...args) {
    const random = (start, end) => (Math.random() * (end - start)) + start;

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
        return new c.NumberLiteral(args[0].content === args[1].content ?
            args[0].content :
            random(args[0].content, args[1].content));
    }
});

const RichEmbed = new c.NativeFunc(async function richembed() {
    return await c.RichEmbed();
});
const Emoji = new c.NativeFunc(async function emoji(context, id) {
    if (id instanceof c.StringLiteral)
        return await c.Emoji(context, id);
    return new c.NullLiteral;
});
const Message = new c.NativeFunc(async function message(context, id) {
    if (id instanceof c.StringLiteral)
        return await c.Message(context, id);
    return new c.NullLiteral;
});
const Role = new c.NativeFunc(async function role(context, id) {
    if (id instanceof c.StringLiteral)
        return await c.Role(context, id);
    return new c.NullLiteral;
});
const Member = new c.NativeFunc(async function member(context, id) {
    if (id instanceof c.StringLiteral)
        return await c.GuildMember(context, id);
    return new c.NullLiteral;
});
const Channel = new c.NativeFunc(async function channel(context, id) {
    if (id instanceof c.StringLiteral)
        return await c.Channel(context, id);
    return new c.NullLiteral;
});

// storage

const storage = new c.NativeFunc(function storage(context, storageId) {
    if (!(storageId instanceof c.StringLiteral)) return new c.NullLiteral;

    storageId = storageId.content;

    return new c.ObjectLiteral({
        get: new c.NativeFunc("get", async function get(context, key) {
            if (!(key instanceof c.NumberLiteral || key instanceof c.StringLiteral)) return new c.NullLiteral;
            key = key.native;

            const data = await database.then(db => db.findOne({ guildId: context.guildId, storageId }))
                .catch(() => { throw context.error("Couldn't get data from database"); });
            if (!data) return new c.NullLiteral;

            const json = BSON.deserialize(data.data.buffer);

            const value = c.convert(json[key]);
            return value;
        }),
        has: new c.NativeFunc("has", async function has(context, key) {
            if (!(key instanceof c.NumberLiteral || key instanceof c.StringLiteral)) return new c.NullLiteral;
            key = key.native;

            const data = await database.then(db => db.findOne({ guildId: context.guildId, storageId }))
                .catch(() => { throw context.error("Couldn't get data from database"); });
            if (!data) return new c.BooleanLiteral(false);

            const json = BSON.deserialize(data.data.buffer);
            if (!json[key]) return new c.BooleanLiteral(false);

            return new c.BooleanLiteral(true);
        }),
        set: new c.NativeFunc("set", async function set(context, key, value) {
            if (!(key instanceof c.NumberLiteral || key instanceof c.StringLiteral))
                throw context.error("A storage key may only be a String or a Number", context.args[0]);
            key = key.native;

            if (!(value instanceof c.Literal))
                throw context.error("A storage value can only be a literal, not a func", context.args[1]);
            value = value.native;

            // calculate doc size
            const cursor = await database
                .then(db => db.find({ guildId: context.guildId }).toArray())
                .catch(() => { throw context.error("Couldn't get data from database"); });

            const relevantDocs = [];
            for (let doc of cursor) relevantDocs.push({ storageId: doc.storageId, data: doc.data });
            const storageDoc = relevantDocs.find(doc => doc.storageId === storageId);
            let json = {};
            let data;
            if (storageDoc) {
                json = BSON.deserialize(storageDoc.data.buffer);
                json[key] = value;
                storageDoc.data = new BSON.Binary(BSON.serialize(json));
                data = storageDoc.data;
            } else {
                json[key] = value;
                data = new BSON.Binary(BSON.serialize(json));
                relevantDocs.push({ storageId: storageId, data });
            }

            let docsSize = 0;
            for (let doc of relevantDocs) docsSize += BSON.calculateObjectSize(doc);

            if (docsSize > 1024 * 500) {
                throw context.error("Storage per guild cannot exceed 500kb!");
            }

            await database.then(db => db.updateOne({ guildId: context.guildId, storageId }, { $set: { data } }, { upsert: true }))
                .catch(() => { throw context.error("Couldn't update data in database"); });

            return value;
        }),
        delete: new c.NativeFunc("delete", async function del(context, key) {
            if (!(key instanceof c.NumberLiteral || key instanceof c.StringLiteral)) return new c.BooleanLiteral(false);
            key = key.native;

            const data = await database.then(db => db.findOne({ guildId: context.guildId, storageId }))
                .catch(() => { throw context.error("Couldn't get data from database"); });
            if (!data) return new c.BooleanLiteral(true);

            const json = BSON.deserialize(data.data.buffer);
            delete json[key];

            try {
                await database.then(db => db.updateOne(
                    { guildId: context.guildId, storageId },
                    { $set: { data: new BSON.Binary(BSON.serialize(json)) } }
                ));
            } catch (_) {
                throw context.error("Couldn't update data in database");
            }

            return new c.BooleanLiteral(true);
        }),
        keys: new c.NativeFunc("keys", async function keys(context) {
            const data = await database.then(db => db.findOne({ guildId: context.guildId, storageId }))
                .catch(() => { throw context.error("Couldn't get data from database"); });
            const json = BSON.deserialize(data.data.buffer);
            return Object.keys(json).map(s => new c.StringLiteral(s));
        }),
        all: new c.NativeFunc("all", async function all(context) {
            const data = await database.then(db => db.findOne({ guildId: context.guildId, storageId }))
                .catch(() => { throw context.error("Couldn't get data from database"); });
            const json = BSON.deserialize(data.data.buffer);
            return c.convert(json);
        }),
    });
});

const pad = new c.NativeFunc("pad", function pad(context, value, width, fill = new c.StringLiteral("0")) {
    if (!(width instanceof c.NumberLiteral)) throw context.error("parameter >length< must be a Number", context.args[1]);

    width = width.content;
    value = value.getProp(new c.StringLiteral("toString")).call(new Context(context.interpreter, context.args[0]), value).content;
    fill = fill.getProp(new c.StringLiteral("toString")).call(new Context(context.interpreter, context.args[2]), fill).content;

    const str = value.length >= width ? value : new global.Array(width - value.length + 1).join(fill) + value;

    return new c.StringLiteral(str);
});

const parseHumanDuration = new c.NativeFunc("parseHumanTime", function parseHumanDuration(_, str) {
    if (!(str instanceof c.StringLiteral)) return new c.NumberLiteral(N_NaN);
    return new c.DurationLiteral(moment.duration(_parseHumanTime(str.content), "milliseconds"));
});
const toHumanDuration = new c.NativeFunc("toHumanTime", function toHumanDuration(_, num) {
    if (!(num instanceof c.NumberLiteral || num instanceof c.DurationLiteral)) return new c.StringLiteral("");
    return new c.StringLiteral(_toHumanTime(num.content));
});

const since = new c.NativeFunc("since", function since(_, time) {
    if (!(time instanceof c.TimeLiteral)) return new c.DurationLiteral();
    return new c.DurationLiteral(moment.duration(time.time.diff(moment())));
});
const until = new c.NativeFunc("until", function until(_, time) {
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
    RegExp,
    Array,
    Object,

    MAX_SAFE_INTEGER,
    MIN_SAFE_INTEGER,
    MIN_SAFE_DIFFERENCE,
    NaN: N_NaN,
    Infinity: N_Infinity,

    E, LN2, LN10, LOG2E, LOG10E, SQRT1_2, SQRT2, PI,

    isNaN,
    isFinite,
    parseNumber,

    floor,
    ceil,
    round,

    exp, abs, acos, cos, acosh, cosh, asin, sin, asinh, sinh, atan, tan, atanh, tanh, atan2,
    cbrt, sqrt, hypot, log, log10, log2, max, min,

    random,
    pad,

    Time,
    now,
    Duration,

    RichEmbed,

    Emoji,
    Message,
    Role,
    Member,
    Channel,

    storage,

    parseHumanDuration,
    toHumanDuration,

    since, until,

    MILLISECOND, SECOND, MINUTE, HOUR, DAY,
};
