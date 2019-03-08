const log = require("../../../modules/log");
const { getExcerpt } = require("./util");
const ParsingError = require("./ParsingError");
const Token = require("./Token");
const Rule = require("./Rule");
const ActionContext = require("./ActionContext");

class Tokenizer {
    /** Create a new tokenization instance. */
    constructor() {
        /** @type {(ctx: ActionContext, match: RegExpExecArray, rule: Rule) => void} */
        this._before = null;
        /** @type {(ctx: ActionContext, match: RegExpExecArray, rule: Rule) => void} */
        this._after = null;
        /** @type {(ctx: ActionContext) => void} */
        this._finish = null;
        /** @type {Rule[]} */
        this._rules = [];
        /** @type {Map<string, string>} */
        this.definitions = new Map;
        this._debug = false;
        this.reset();
    }

    /** Reset the tokenization instance to a fresh one by discarding all internal state information.  */
    reset() {
        this._input = "";
        this._len = 0;
        this._eof = false;
        this._pos = 0;
        this._line = 1;
        this._column = 1;
        this._state = ["default"];
        /** @type {Set<string>} */
        this._tags = new Set;
        /** @type {any[][]} */
        this._transaction = [];
        /** @type {Token[]} */
        this._pending = [];
        this._stopped = false;
        this._ctx = new ActionContext(this);
        return this;
    }

    /**
     * Returns a new instance of `Tokenizer.ParsingError`, based on the current input character 
     * stream position, and with `Tokenizer.ParsingError#message` set to message.
     * @param {string} msg
     */
    error(msg) {
        return new ParsingError(msg, this._pos, this._line, this._column, this._input);
    }

    /**
     * output a debug message
     * @param {string} msg
     */
    _log(msg) {
        if (this._debug) log.debug("Tokenizer", msg);
    }

    /**
     * Enable (or disable) verbose logging for debugging purposes.
     * @param {boolean} debug
     */
    setDebugEnabled(debug) {
        this._debug = debug;
        return this;
    }

    /**
     * Set the input string to tokenize. This implicitly performs a `reset()` operation beforehand.
     * @param {string} input 
     */
    setInput(input) {
        this.reset();
        this._input = input;
        this._len = input.length;
        return this;
    }

    /**
     * Push a state onto the state stack.
     * @param {string} state 
     */
    pushState(state) {
        this._log("STATE (PUSH): " +
            `old: <${this._state[this._state.length - 1]}>, ` +
            `new: <${state}>`);
        this._state.push(state);
        return this;
    }

    /** Pop a state from the state stack. The initial (aka first or lowest) stack value (`default`) cannot be popped. */
    popState() {
        /*  sanity check arguments  */
        if (this._state.length < 2) throw new Error("no more custom states to pop");

        this._log("STATE (POP): " +
            `old: <${this._state[this._state.length - 1]}>, ` +
            `new: <${this._state[this._state.length - 2]}>`);
        return this._state.pop();
    }

    /**
     * Get the state on the top of the state stack. The initial state is named `default`.
     */
    getState() {
        return this._state[this._state.length - 1];
    }

    /**
     * Set the state on the top of the state stack. Use this to initialy start tokenizing with a custom state. The initial state is named `default`.
     * @param {string} state
     */
    setState(state) {
        this._log("STATE (SET): " +
            `old: <${this._state[this._state.length - 1]}>, ` +
            `new: <${state}>`);
        this._state[this._state.length - 1] = state;
        return this;
    }

    /**
     * Set a tag. The tag has to be matched by rules.
     * @param {string} tag 
     */
    setTag(tag) {
        this._log(`TAG (ADD): ${tag}`);
        this._tags.add(tag);
        return this;
    }

    /**
     * Check whether a particular tag is set.
     * @param {string} tag
     */
    hasTag(tag) {
        return this._tags.has(tag);
    }

    /**
     * Unset a particular tag. The tag no longer will be matched by rules.
     * @param {string} tag 
     */
    removeTag(tag) {
        /*  delete tag  */
        this._log(`TAG (DEL): ${tag}`);
        this._tags.delete(tag);
        return this;
    }

    /**  
     * Configure a single action which is called directly before any rule action (configured with `Tokenizer#addRule()`) is called. 
     * This can be used to execute a common action just before all rule actions. The `rule` argument is the `Tokenizer#addRule()` 
     * information of the particular rule which is executed.  */
    setBefore(action) {
        this._before = action;
        return this;
    }

    /**  
     * Configure a single action which is called directly after any rule action (configured with `Tokenizer#addRule()`) is called. This 
     * can be used to execute a common action just after all rule actions. The `rule` argument is the `Tokenizer#addRule()` information of 
     * the particular rule which is executed.  */
    setAfter(action) {
        this._after = action;
        return this;
    }

    /** 
     * Configure a single action which is called directly before an `EOF` token is emitted. This can be used to execute a common action 
     * just after the last rule action was called.  */
    setFinish(action) {
        this._finish = action;
        return this;
    }

    /**  
     * configure a tokenization rule
     * @param {Rule} rule 
     */
    addRule(rule) {
        if (!(rule instanceof Rule)) throw new Error("`rule` provided is not a `Rule`");
        
        /*  store rule  */
        this._log(`RULE: configure rule (${rule.toString()})`);
        this._rules.push(rule);

        return this;
    }

    /**
     * configure multiple tokenization rules
     * @param {Rule[]} rules 
     */
    addRules(rules) {
        for (const rule of rules) this.addRule(rule);
        return this;
    }

    /**  progress the line/column counter  */
    _progress(from, until) {
        const line = this._line;
        const column = this._column;
        const str = this._input;
        for (let i = from; i < until; i++) {
            const char = str.charAt(i);
            if (char === "\r") {
                this._column = 1;
            } else if (char === "\n") {
                this._line++;
                this._column = 1;
            } else if (char === "\t") {
                this._column += 8 - (this._column % 8);
            } else {
                this._column++;
            }
        }
        this._log(`PROGRESS: characters: ${until - from}, ` +
            `from: <line ${line}, column ${column}>, ` +
            `to: <line ${this._line}, column ${this._column}>`);
    }

    _tokenize() {
        /*  helper function for finishing parsing  */
        const finish = () => {
            if (this._eof) return;

            if (this._finish !== null) this._finish.call(this._ctx, this._ctx);
            this._eof = true;
            this._pending.push(new Token("EOF", "", "", this._pos, this._line, this._column));
        };

        /*  tokenize only as long as we were not stopped and there is input left  */
        if (this._stopped || this._pos >= this._len) return finish();

        /*  loop...  */
        let continued = true;
        while (continued) {
            continued = false;

            /*  some optional debugging context  */
            if (this._debug) {
                const excerpt = getExcerpt(this._input, this._pos);
                const tags = Array.from(this._tags.values()).map((tag) => `#${tag}`).join(" ");
                this._log(`INPUT: state: <${this._state[this._state.length - 1]}>, tags: <${tags}>, text: ` +
                    (excerpt.prologTrunc ? "..." : "\"") + `${excerpt.prologText}<${excerpt.tokenText}>${excerpt.epilogText}` +
                    (excerpt.epilogTrunc ? "..." : "\"") + `, at: <line ${this._line}, column ${this._column}>`);
            }

            for (const rule of this._rules) {
                if (this._debug) {
                    const state = rule.state.map(item => {
                        let output = item.state;
                        if (item.tags.length > 0) output += " " + item.tags.map((tag) => `#${tag}`).join(" ");
                        return output;
                    }).join(", ");
                    this._log(`RULE: state(s): <${state}>, pattern: ${JSON.stringify(rule.pattern.source)}`);
                }

                let matches = false;
                let states = rule.state.map(item => item.state);
                let idx = states.indexOf("*");
                if (idx < 0) {
                    idx = states.indexOf(this._state[this._state.length - 1]);
                }
                if (idx >= 0) {
                    matches = true;
                    const tags = rule.state[idx].tags.filter(tag => !this.hasTag(tag));
                    if (tags.length > 0) matches = false;
                }
                if (!matches) continue;

                rule.pattern.lastIndex = this._pos;
                const found = rule.pattern.exec(this._input);

                // if nothing found, or index is not at current position, move on to next rule
                if (found === null || found.index !== this._pos) continue;

                if (this._debug) this._log("MATCHED: " + JSON.stringify(found));

                /*  pattern found, so give action a chance to operate
                    on it and act according to its results  */
                this._ctx.setMatch(found);

                if (this._before !== null) this._before.call(this._ctx, this._ctx, found, rule);
                rule.action.call(this._ctx, this._ctx, found);
                if (this._after !== null) this._after.call(this._ctx, this._ctx, found, rule);

                /*  reject current action, continue matching  */
                if (this._ctx._reject) continue;
                /*  repeat matching from scratch  */
                else if (this._ctx._repeat) {
                    continued = true;
                    break;
                }
                /*  ignore token  */
                else if (this._ctx._ignore) {
                    this._progress(this._pos, rule.pattern.lastIndex);
                    this._pos = rule.pattern.lastIndex;
                    if (this._pos >= this._len) return finish();
                    continued = true;
                    break;
                }
                /*  accept token(s)  */
                else if (this._pending.length > 0) {
                    this._progress(this._pos, rule.pattern.lastIndex);
                    this._pos = rule.pattern.lastIndex;
                    if (this._pos >= this._len) finish();
                    return;
                }
                else throw new Error("action of pattern \"" + rule.pattern.source + "\" neither rejected nor accepted any token(s)");
            }
        }

        /*  no pattern matched at all  */
        throw this.error("token not recognized");
    }

    /**  
     * Get the next token from the input. Internally, the current position of the input is matched against 
     * the patterns of all rules (in rule configuration order). The first rule action which accepts the 
     * matching leads to the token.  */
    getNextToken() {
        /*  if no more tokens are pending, try to determine a new one  */
        if (this._pending.length === 0) this._tokenize();

        /*  return now potentially pending token  */
        if (this._pending.length > 0) {
            const token = this._pending.shift();
            if (this._transaction.length > 0) this._transaction[0].push(token);
            this._log(`TOKEN: ${token.toString()}`);
            return token;
        }

        /*  no more tokens  */
        return null;
    }

    /**  
     * Tokenizes the entire input and returns all the corresponding tokens. This is a convenience method only. 
     * Usually one takes just single tokens at a time with `Tokenizer#getNextToken()`.  */
    getAllTokens() {
        const result = [];
        let token;
        while ((token = this.getNextToken()) !== null) result.push(token);
        return result;
    }

    /** 
     * Peek at the following token at the (0-based) offset without consuming the token. This is the secondary 
     * function used in Recursive Descent parsers.  */
    peek(offset = 0) {
        for (let i = 0; i < this._pending.length + offset; i++) this._tokenize();
        if (offset >= this._pending.length) throw new Error("not enough tokens available for peek operation");
        this._log(`PEEK: ${this._pending[offset].toString()}`);

        return this._pending[offset];
    }

    /**  Get and discard the next number of following tokens with `Tokenizer#getNextToken()`.  */
    skip(len) {
        if (typeof len === "undefined") len = 1;
        for (let i = 0; i < this._pending.length + len; i++) this._tokenize();
        if (len > this._pending.length) throw new Error("not enough tokens available for skip operation");
        while (len-- > 0) this.getNextToken();

        return this;
    }

    /**  
     * Match (with `Tokenizer.Token#isEqual()`) the next token. If it matches `type` and optionally also `value`, 
     * consume it. If it does not match, throw a `Tokenizer.ParsingError`. This is the primary function 
     * used in Recursive Descent parsers.
     * 
     * @param {string} type
     * @param {any} value
     */
    consume(type, value) {
        for (let i = 0; i < this._pending.length + 1; i++) this._tokenize();
        if (this._pending.length === 0) throw new Error("not enough tokens available for consume operation");

        const token = this.getNextToken();
        this._log(`CONSUME: ${token.toString()}`);
        const raiseError = () => {
            throw new ParsingError(
                `expected: <type: ${type}, value: ${JSON.stringify(value)} (${typeof value})>, ` +
                `found: <type: ${token.type}, value: ${JSON.stringify(token.value)} (${typeof token.value})>`,
                token.pos, token.line, token.column, this._input
            );
        };

        if (arguments.length === 2 && !token.isEqual(type, value)) raiseError(JSON.stringify(value), typeof value);
        else if (!token.isEqual(type)) raiseError("*", "any");

        return token;
    }

    /**  
     * Begin a transaction. Until `Tokenizer#commit()` or `Tokenizer#rollback()` are called, all consumed tokens 
     * will be internally remembered and be either thrown away (on `Tokenizer#commit()`) or pushed back (on `Tokenizer#rollback()`). 
     * This can be used multiple times and this way supports nested transactions. It is intended to be used for
     * tokenizing alternatives.  */
    begin() {
        this._log(`BEGIN: level ${this._transaction.length}`);
        this._transaction.unshift([]);
        return this;
    }

    /**  
     * Return the number of already consumed tokens in the currently active transaction. This is useful if 
     * multiple alternatives are parsed and in case all failed, to report the error for the most specific one, 
     * i.e., the one which consumed most tokens. */
    depth() {
        if (this._transaction.length === 0) throw new Error("cannot determine depth -- no active transaction");
        return this._transaction[0].length;
    }

    /**  End a transaction successfully. All consumed tokens are finally gone.  */
    commit() {
        if (this._transaction.length === 0) throw new Error("cannot commit transaction -- no active transaction");
        this._transaction.shift();
        this._log(`COMMIT: level ${this._transaction.length}`);
        return this;
    }

    /** E nd a transaction unsuccessfully. All consumed tokens are pushed back and can be consumed again.  */
    rollback() {
        if (this._transaction.length === 0) throw new Error("cannot rollback transaction -- no active transaction");
        this._pending = this._transaction[0].concat(this._pending);
        this._transaction.shift();
        this._log(`ROLLBACK: level ${this._transaction.length}`);
        return this;
    }

    /**  
     * Utility method for parsing alternatives. It internally executes the supplied callback functions in 
     * sequence, each wrapped into its own transaction. The first one which succeeds (does not throw an 
     * exception and returns a value) leads to the successful result. In case all alternatives failed (all 
     * throw an exception), the exception of the most-specific alterative (the one with the largest 
     * transaction depth) is re-thrown. The `this` in each callback function points to the `Tokenizer` object on 
     * which alternatives was called.
     * @param {Array<() => any>} alternatives
      */
    alternatives(...alternatives) {
        let result = null;
        let depths = [];
        for (let i = 0; i < alternatives.length; i++) {
            try {
                this.begin();
                result = alternatives[i].call(this);
                this.commit();
                break;
            } catch (ex) {
                this._log(`EXCEPTION: ${ex.toString()}`);
                depths.push({ ex: ex, depth: this.depth() });
                this.rollback();
                continue;
            }
        }
        if (result === null && depths.length > 0) {
            depths = depths.sort((a, b) => a.depth - b.depth);
            throw depths[0].ex;
        }
        return result;
    }
}

module.exports = {
    Tokenizer,
    Rule,
    Token,
    ParsingError,
    ActionContext
};