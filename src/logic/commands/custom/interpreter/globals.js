const c = require("./classes");

// Literal Functions

const Boolean = new c.NativeFunc(function (arg0) {
    if (arg0 instanceof c.NumberLiteral) {
        return new c.BooleanLiteral(arg0.content > 0 ? true : false);
    }
    if (arg0 instanceof c.StringLiteral) {
        return new c.BooleanLiteral(arg0.content === "true" ? true : false);
    }
    return new c.BooleanLiteral(!!arg0.content);
});

const Number = new c.NativeFunc(function (arg0) {
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

const String = new c.NativeFunc(function (arg0) {
    return new StringLiteral(new global.String(arg0.content));
});

const Array = new c.NativeFunc(function (arg0) {
    if (arg0 instanceof c.NumberLiteral) {
        return new c.ArrayLiteral(new global.Array(arg0.content));
    }
    return new c.ArrayLiteral([]);
});

const Object = new c.NativeFunc(function (arg0) {
    if (arg0 instanceof c.ObjectLiteral) {
        return new c.ObjectLiteral(new global.Object(arg0.content));
    }
    return new c.ObjectLiteral({});
});

const MAX_SAFE_INTEGER = new c.NumberLiteral(global.Number.MAX_SAFE_INTEGER);
const NaN = new c.NumberLiteral(global.NaN);
const Infinity = new c.NumberLiteral(global.Infinity);
const isNaN = new c.NativeFunc(function (number) {
    return new c.BooleanLiteral(global.isNaN(number.content));
});
const isFinite = new c.NativeFunc(function (number) {
    return new c.BooleanLiteral(global.isFinite(number.content));
});
const parseNumber = new c.NativeFunc(function (string) {
    return new c.NumberLiteral(
        string instanceof classese.StringLiteral ?
            global.parseFloat(string.content) :
            global.NaN
    );
});
const floor = new c.NativeFunc(function (num) {
    return new c.NumberLiteral(Math.floor(num.content) );
});
const ceil = new c.NativeFunc(function (num) {
    return new c.NumberLiteral(Math.ceil(num.content));
});
const round = new c.NativeFunc(function (num) {
    return new c.NumberLiteral(Math.round(num.content));
});
const sqrt = new c.NativeFunc(function (num) {
    return new c.NumberLiteral(Math.sqrt(num.content));
});

const Date = new c.NativeFunc(function () {
    return new c.DateObject(new global.Date());
});
const now = new c.NativeFunc(function () {
    return new c.NumberLiteral(global.Date.now());
});

const random = new c.NativeFunc(function (...args) {
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

const RichEmbed = new c.NativeFunc(function () {
    const embed = {
        author: null,
        color: null,
        description: null,
        fields: [],
        footer: null,
        image: null,
        thumbnail: null,
        timestamp: null,
        title: null,
        url: null
    };
    function addField(name, value, inline) {
        if (embed.fields.length >= 25) throw new RangeError("RichEmbeds may not exceed 25 fields.");
        if (name.length > 256) throw new RangeError("RichEmbed field names may not exceed 256 characters.");
        if (!/\S/.test(name)) throw new RangeError("RichEmbed field names may not be empty.");
        if (value.length > 1024) throw new RangeError("RichEmbed field values may not exceed 1024 characters.");
        if (!/\S/.test(value)) throw new RangeError("RichEmbed field values may not be empty.");
        embed.fields.push({ name, value, inline });
    }

    const obj = new c.ObjectLiteral({
        addBlankField: new c.NativeFunc(function (inline = new c.BooleanLiteral(false)) {
            addField("\u200B", "\u200B", inline.content);
            return obj;
        }),
        addField: new c.NativeFunc(function (name, value, inline = new c.BooleanLiteral(false)) {
            addField(name ? name.content : undefined, value ? value.content : undefined, inline);
            return obj;
        }),

        setAuthor: new c.NativeFunc(function (name = new c.StringLiteral(""), icon, url) {
            embed.author = {
                name: name.content, icon_url: icon ? icon.content : undefined, url: url ? url.content : undefined
            };
            return obj;
        }),

        setColor: new c.NativeFunc(function (color = new c.NumberLiteral(0)) {
            if (color instanceof c.StringLiteral) {
                color = color.content;
                if (color === "RANDOM") return Math.floor(Math.random() * (0xFFFFFF + 1));
                if (color === "DEFAULT") return 0;
                color = parseInt(color.replace("#", ""), 16);
            } else {
                color = color.content;
            }

            if (color < 0 || color > 0xFFFFFF) {
                throw new RangeError("Color must be within the range 0 - 16777215 (0xFFFFFF).");
            } else if (color && global.isNaN(color)) {
                throw new TypeError("Unable to convert color to a number.");
            }

            embed.color = color;
            return obj;
        }),
        setDescription: new c.NativeFunc(function (description = new c.StringLiteral("")) {
            description = description.content;
            if (description.length > 2048) throw new RangeError("RichEmbed descriptions may not exceed 2048 characters.");
            embed.description = description;
            return obj;
        }),
        setFooter: new c.NativeFunc(function (text = new c.StringLiteral(""), icon = new c.NullLiteral) {
            text = text.content;
            if (text.length > 2048) throw new RangeError("RichEmbed footer text may not exceed 2048 characters.");
            embed.footer = { text, icon_url: icon.content };
            return obj;
        }),
        setImage: new c.NativeFunc(function (url = new c.NullLiteral) {
            embed.image = { url: url.content };
            return obj;
        }),
        setThumbnail: new c.NativeFunc(function (url = new c.NullLiteral) {
            embed.thumbnail = { url: url.content };
            return obj;
        }),
        setTimestamp: new c.NativeFunc(function (timestamp = new c.NumberLiteral(Date.now())) {
            embed.timestamp = new Date(timestamp.content);
            return obj;
        }),
        setTitle: new c.NativeFunc(function (title = new c.StringLiteral("")) {
            title = title.content;
            if (title.length > 2048) throw new RangeError("RichEmbed title text may not exceed 2048 characters.");
            embed.title = title;
            return obj;
        }),
        setURL: new c.NativeFunc(function (url = new c.NullLiteral) {
            embed.url = url.content;
            return obj;
        })
    });
    obj.isEmbed = true;
    obj.getEmbed = () => embed;
    return obj;
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
    
};