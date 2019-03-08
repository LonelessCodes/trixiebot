const Token = require("./Token");

class ActionContext {
    /*  construct and initialize the object  */
    constructor(tokenizer) {
        this._tokenizer = tokenizer;
        this._data = new Map;
        this._repeat = false;
        this._reject = false;
        this._ignore = false;
        this._match = null;
    }

    /** 
     * @param {RegExpExecArray} match
     */
    setMatch(match) {
        this._match = match;
        this._repeat = false;
        this._reject = false;
        this._ignore = false;
    }

    /**  
     * Retreive any user data (indexed by `key`) to the action context for sharing data 
     * between two or more rules.
     * @param {string} key
     */
    getData(key) {
        return this._data.get(key);
    }

    /**
     * Store any user data (indexed by key) to the action context for sharing data
     * between two or more rules.
     * @param {string} key
     */
    setData(key, value) {
        if (arguments.length === 2) this._data.set(key, value);
        return value;
    }

    /**  Retrieve information about the current matching.  */
    getInfo() {
        return {
            /** @type {number} */
            line: this._tokenizer._line,
            /** @type {number} */
            column: this._tokenizer._column,
            /** @type {number} */
            pos: this._tokenizer._pos,
            /** @type {number} */
            len: this._match[0].length
        };
    }

    //  pass-through functions to attached tokenizer 
    /**
     * Returns a new instance of `Tokenizer.ParsingError`, based on the current input character
     * stream position, and with `Tokenizer.ParsingError#message` set to message.
     * @param {string} msg 
     */
    error(msg) {
        return this._tokenizer.error(msg);
    }
    /**
     * push state
     * @param {string} state
     */
    pushState(state) {
        this._tokenizer.pushState(state);
        return this;
    }
    /**  pop state */
    popState() {
        return this._tokenizer.popState();
    }
    /** get state */
    getState() {
        return this._tokenizer.getState();
    }
    /**
     * set state
     * @param {string} state
     */
    setState(state) {
        this._tokenizer.setState(state);
        return this;
    }
    /**
     * set a tag
     * @param {string} tag 
     */
    setTag(tag) {
        this._tokenizer.setTag(tag);
        return this;
    }
    /**
     * check whether tag is set
     * @param {string} tag
     */
    hasTag(tag) {
        return this._tokenizer.hasTag(tag);
    }
    /**
     * remove a tag
     * @param {string} tag 
     */
    removeTag(tag) {
        this._tokenizer.removeTag(tag);
        return this;
    }

    /** 
     * Mark the tokenization process to repeat the matching at the current input position from scratch. 
     * You first have to switch to a different state with `ActionContext#setState()` or this will 
     * lead to an endless loop, of course!
     */
    repeat() {
        this._tokenizer._log("REPEAT");
        this._repeat = true;
        return this;
    }

    /** Mark the current matching to be rejected. The tokenization process will continue matching following rules.  */
    reject() {
        this._tokenizer._log("REJECT");
        this._reject = true;
        return this;
    }

    /**  Mark the current matching to be just ignored. This is usually used for skipping whitespaces.  */
    ignore() {
        this._tokenizer._log("IGNORE");
        this._ignore = true;
        return this;
    }

    /** 
     * Accept the current matching and produce a token of `type` and optionally with a different `value` 
     * (usually a pre-processed variant of the matched text). This function can be called multiple times
     * to produce one or more distinct tokens in sequence.
     * @param {string} type
     * @param {any} value
     */
    accept(type, value) {
        if (arguments.length < 2) value = this._match[0];
        this._tokenizer._log(`ACCEPT: type: ${type}, value: ${JSON.stringify(value)} (${typeof value}), text: ${JSON.stringify(this._match[0])}`);
        this._tokenizer._pending.push(new Token(
            type, value, this._match[0],
            this._tokenizer._pos, this._tokenizer._line, this._tokenizer._column
        ));
        return this;
    }

    /**  Immediately stop entire tokenization. After this the Tokenizer#token() method immediately starts to return null.  */
    stop() {
        this._tokenizer._stopped = true;
        return this;
    }
}

module.exports = ActionContext;