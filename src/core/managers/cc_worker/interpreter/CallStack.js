class CallStack {
    constructor(max = 20) {
        this.max = max;
        /** @type {CallTrace[]} */
        this._stack = [];

        /** @type {string[]} */
        this.funcNames = [];
    }

    pushFunc(name) {
        this.funcNames.unshift(name);
    }

    popFunc() {
        this.funcNames.shift();
    }

    getFunc() {
        return this.funcNames[0] || "(anonymous)";
    }

    push(stack) {
        stack.setName(this.getFunc());
        this._stack.unshift(stack);
    }

    pop() {
        this._stack.shift();
    }

    getStackTrace() {
        return this._stack.slice(0, this.max);
    }

    clear() {
        this.funcNames = [];
        this._stack = [];
    }
}

class CallTrace {
    /**
     * @param {Position} pos 
     */
    constructor(pos) {
        this.name = "(anonymous)";
        this.pos = pos;
    }

    setName(n) {
        this.name = n;
    }
}

class Position {
    constructor(offset, line, column) {
        this.offset = offset;
        this.line = line;
        this.column = column;
    }

    static fromCST(item) {
        if (item instanceof Position) return item;
        if (Array.isArray(item)) item = item[0];
        while (item.children) item = item.children[Object.getOwnPropertyNames(item.children)[0]][0];
        return new Position(item.startOffset, item.startLine, item.startColumn);
    }
}

module.exports = {
    CallStack,
    CallTrace,
    Position
};