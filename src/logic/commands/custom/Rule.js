const { regexpOrLiteral } = require("./util");
const ActionContext = require("./ActionContext");

class Rule {
    /**
     * Configure a token matching rule which executes its `action` in case
     * the current tokenization state is one of the states (and all of the
     * currently set tags) in `state` (by default the rule matches all states
     * if `state` is not specified) and the next input characters match
     * against the `pattern`. The exact syntax of `state` is
     * `<state>[ #<tag> #<tag> ...][, <state>[ #<tag> #<tag> ...], ...]`, i.e.,
     * it is one or more comma-separated state matches (OR-combined) and each state
     * match has exactly one state and zero or more space-separated tags
     * (AND-combined). The `ctx` argument provides a context object for token
     * repeating/rejecting/ignoring/accepting, the `match` argument is the
     * result of the underlying `RegExp#exec` call.
     *
     * @constructor
     * @variation 1
     * @param {string|RegExp} pattern
     *//**
     * Configure a token matching rule which executes its `action` in case
     * the current tokenization state is one of the states (and all of the
     * currently set tags) in `state` (by default the rule matches all states
     * if `state` is not specified) and the next input characters match
     * against the `pattern`. The exact syntax of `state` is
     * `<state>[ #<tag> #<tag> ...][, <state>[ #<tag> #<tag> ...], ...]`, i.e.,
     * it is one or more comma-separated state matches (OR-combined) and each state
     * match has exactly one state and zero or more space-separated tags
     * (AND-combined). The `ctx` argument provides a context object for token
     * repeating/rejecting/ignoring/accepting, the `match` argument is the
     * result of the underlying `RegExp#exec` call.
     *
     * @constructor
     * @variation 2
     * @param {string|RegExp} pattern
     * @param {(ctx: ActionContext, match: RegExpExecArray) => void} action
     *//**
     * Configure a token matching rule which executes its `action` in case
     * the current tokenization state is one of the states (and all of the
     * currently set tags) in `state` (by default the rule matches all states
     * if `state` is not specified) and the next input characters match
     * against the `pattern`. The exact syntax of `state` is
     * `<state>[ #<tag> #<tag> ...][, <state>[ #<tag> #<tag> ...], ...]`, i.e.,
     * it is one or more comma-separated state matches (OR-combined) and each state
     * match has exactly one state and zero or more space-separated tags
     * (AND-combined). The `ctx` argument provides a context object for token
     * repeating/rejecting/ignoring/accepting, the `match` argument is the
     * result of the underlying `RegExp#exec` call.
     *
     * @constructor
     * @variation 3
     * @param {string} state
     * @param {string|string[|RegExp} pattern
     * @param {(ctx: ActionContext, match: RegExpExecArray) => void} action
     * @param {string} name
     */
    constructor(state, pattern, action, name = "unknown") {
        //  support optional states
        if (arguments.length === 1) {
            [pattern] = [state];
            state = "*";
        } else if (arguments.length === 2 && typeof pattern === "function") {
            [pattern, action] = [state, pattern];
            state = "*";
        }
        else if (arguments.length === 3 && typeof pattern === "function") {
            [pattern, action, name] = [state, pattern, action];
            state = "*";
        }

        if (action == null)
            action = ctx => ctx.ignore();

        //  sanity check arguments
        if (typeof state !== "string")
            throw new Error("parameter \"state\" not a String");
        if (typeof pattern !== "string" && !(typeof pattern === "array" && pattern.length > 0 && typeof pattern[0] == "string") && !(typeof pattern === "object" && pattern instanceof RegExp))
            throw new Error("parameter \"pattern\" not a RegExp or String");
        if (typeof action !== "function")
            throw new Error("parameter \"action\" not a Function");
        if (typeof name !== "string")
            throw new Error("parameter \"name\" not a String");

        //  post-process state 
        const stateArr = state.split(/\s*,\s*/g).map((entry) => {
            let items = entry.split(/\s+/g);
            let states = items.filter((item) => item.match(/^#/) === null);
            let tags = items.filter((item) => item.match(/^#/) !== null)
                .map((tag) => tag.replace(/^#/, ""));
            if (states.length !== 1)
                throw new Error("exactly one state required");
            return { state: states[0], tags: tags };
        });

        const regexp = regexpOrLiteral(pattern);

        if (regexp.test("")) throw new Error("RegExp matches empty string: " + regexp);

        /** @type {{ state: string; tags: string[] }[]} */
        this.state = stateArr;
        /** @type {RegExp} */
        this.pattern = regexp;
        /** @type {(ctx: ActionContext, match: RegExpExecArray) => void} */
        this.action = action;
        /** @type {string} */
        this.name = name;
    }

    toString() {
        return `<Rule state: ${this.state.map(s => `<${s.state}> <${s.tags.join(" ")}>`).join(", ")} pattern: /${this.pattern.source.replace(/\n/g, "\\n")}/${this.pattern.flags}>`;
    }
}

module.exports = Rule;