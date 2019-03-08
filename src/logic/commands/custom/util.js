function isRegExp(obj) { return obj && obj instanceof RegExp; }

/** @param {string} str */
function reEscape(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

/**
 * post process the pattern
 * @param {string|string[]|RegExp} obj 
 */
function regexpOrLiteral(obj) {
    let flags = "g";
    try {
        const regexp = new RegExp("", "y");
        if (typeof regexp.sticky === "boolean") flags = "y"; /* ECMAScript >= 2015 */
    } catch (_) { }

    if (typeof obj === "string") {
        return new RegExp("(?:" + reEscape(obj) + ")", flags);

    } if (typeof obj === "array") {
        return new RegExp("(?:" + obj.map(s => reEscape(s)).join("|") + ")", flags);
        
    } else if (isRegExp(obj)) {
        if (typeof obj.multiline === "boolean" && obj.multiline) flags += "m";
        if (typeof obj.dotAll === "boolean" && obj.dotAll) flags += "s";
        if (typeof obj.ignoreCase === "boolean" && obj.ignoreCase) flags += "i";
        if (typeof obj.unicode === "boolean" && obj.unicode) flags += "u";

        return new RegExp(obj.source, flags);

    } else {
        throw new Error("Not a pattern: " + obj);
    }
}

const hex = (ch) => ch.charCodeAt(0).toString(16).toUpperCase();
const extract = (txt, pos, len) =>
    txt.substr(pos, len)
        .replace(/\\/g, "\\\\")
        .replace(/\x08/g, "\\b")
        .replace(/\t/g, "\\t")
        .replace(/\n/g, "\\n")
        .replace(/\f/g, "\\f")
        .replace(/\r/g, "\\r")
        .replace(/[\x00-\x07\x0B\x0E\x0F]/g, (ch) => "\\x0" + hex(ch))
        .replace(/[\x10-\x1F\x80-\xFF]/g, (ch) => "\\x" + hex(ch))
        .replace(/[\u0100-\u0FFF]/g, (ch) => "\\u0" + hex(ch))
        .replace(/[\u1000-\uFFFF]/g, (ch) => "\\u" + hex(ch));

/**  utility function: create a source excerpt  */
const getExcerpt = (txt, pos) => {
    const len = txt.length;
    let begin = pos - 20; if (begin < 0) begin = 0;
    let end = pos + 20; if (end > len) end = len;
    return {
        prologTrunc: begin > 0,
        prologText: extract(txt, begin, pos - begin),
        tokenText: extract(txt, pos, 1),
        epilogText: extract(txt, pos + 1, end - (pos + 1)),
        epilogTrunc: end < len
    };
};

module.exports = {
    isRegExp,
    regexpOrLiteral,
    getExcerpt
};