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

const Symbol = require("../../../../modules/Symbol");

class StatementStack {
    /** @param {symbol[]} arr */
    constructor(arr = []) {
        this._arr = arr;
    }

    push(ctx) {
        const symbol = ctx.$stackId ? ctx.$stackId[ctx.$stackId.length - 1] : Symbol();
        if (!ctx.$stackId) ctx.$stackId = [symbol];
        this._arr.push(symbol);
        return symbol;
    }

    pushFunc(ctx) {
        const symbol = Symbol();
        if (!ctx.$stackId) ctx.$stackId = [];
        ctx.$stackId.push(symbol);
        this._arr.push(symbol);
        return symbol;
    }

    pop() {
        return this._arr.pop();
    }

    popFunc(ctx) {
        if (ctx.$stackId) ctx.$stackId.pop();
        return this._arr.pop();
    }

    get current() {
        return this._arr[this._arr.length - 1];
    }

    get size() {
        return this._arr.length;
    }

    get(i) {
        return this._arr[i];
    }

    clone() {
        return new StatementStack(this._arr.slice());
    }

    clear() {
        this._arr = [];
    }
}

class StatementManager {
    constructor() {
        /** @type {StatementStack[]} */
        this._arr = [];
    }

    get currentStack() {
        return this._arr[this._arr.length - 1];
    }

    get size() {
        return this.currentStack.size;
    }

    /**
     * @param {StatementStack} stack
     * @returns {number}
     */
    pushChange(stack) {
        return this._arr.push(stack);
    }

    push(ctx) {
        return this.currentStack.push(ctx);
    }

    pop(ctx) {
        return this.currentStack.pop(ctx);
    }

    get current() {
        return this.currentStack.current;
    }

    get(i) {
        return this.currentStack.get(i);
    }

    clone() {
        return this.currentStack.clone();
    }

    popChange() {
        return this._arr.pop();
    }

    clear() {
        this._arr = [];
    }
}

module.exports = {
    StatementStack,
    StatementManager,
};
