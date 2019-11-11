/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

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
    Position,
};
