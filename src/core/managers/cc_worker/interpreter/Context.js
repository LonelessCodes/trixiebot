const { Position } = require("./CallStack");

class Context {
    constructor(interpreter, pos, args = []) {
        this.interpreter = interpreter;
        this.guildId = interpreter.guildId;
        this.settings = interpreter.settings;
        this.pos = pos;
        this.args = args;
    }

    error(msg, pos) {
        return this.interpreter.error(msg, pos || this.pos);
    }

    plus(offset) {
        const pos = Position.fromCST(this.pos);
        pos.column += offset;
        pos.offset += offset;
        return pos;
    }
}

module.exports = Context;
