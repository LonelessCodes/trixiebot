const hex = ch => ch.charCodeAt(0).toString(16).toUpperCase();
const extract = (txt, pos, len) =>
    txt.substr(pos, len)
        .replace(/\\/g, "\\\\")
        .replace(/\x08/g, "\\b")
        .replace(/\t/g, "\\t")
        .replace(/\n/g, "\\n")
        .replace(/\f/g, "\\f")
        .replace(/\r/g, "\\r")
        .replace(/[\x00-\x07\x0B\x0E\x0F]/g, ch => "\\x0" + hex(ch))
        .replace(/[\x10-\x1F\x80-\xFF]/g, ch => "\\x" + hex(ch))
        .replace(/[\u0100-\u0FFF]/g, ch => "\\u0" + hex(ch))
        .replace(/[\u1000-\uFFFF]/g, ch => "\\u" + hex(ch));

/**
 * utility function: create a source excerpt
 * @param {string} txt
 * @param {number} pos
 * @returns {{
    prologTrunc:number,
    prologText: string,
    tokenText: string,
    epilogText: string,
    epilogTrunc: number
    }}
 */
const getExcerpt = (txt, pos) => {
    const len = txt.length;
    let begin = pos - 20; if (begin < 0) begin = 0;
    let end = pos + 20; if (end > len) end = len;
    return {
        prologTrunc: begin > 0,
        prologText: extract(txt, begin, pos - begin),
        tokenText: extract(txt, pos, 1),
        epilogText: extract(txt, pos + 1, end - (pos + 1)),
        epilogTrunc: end < len,
    };
};

const log = require("../../../log").namespace("cc worker");

module.exports = {
    getExcerpt,
    log,
};
