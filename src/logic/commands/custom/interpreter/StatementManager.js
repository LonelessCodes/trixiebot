const Symbol = require("../Symbol");

class StatementStack {
    /** @param {Symbol[]} arr */
    constructor(arr = []) {
        this._arr = arr;
    }

    push(ctx) {
        const id = ctx.$stackId = Symbol();
        this._arr.push(id);
        return id;
    }

    pop() {
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
     */
    pushChange(stack) {
        return this._arr.push(stack);
    }

    push(ctx) {
        return this.currentStack.push(ctx);
    }

    pop() {
        return this.currentStack.pop();
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