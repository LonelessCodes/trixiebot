/** internal helper class for token representation  */
class Token {
    constructor(type, value, text, pos = 0, line = 0, column = 0) {
        this.type = type;
        this.value = value;
        this.text = text;
        this.pos = pos;
        this.line = line;
        this.column = column;
    }

    toString() {
        return `<Token type: ${this.type}, ` +
            `value: ${JSON.stringify(this.value)}, ` +
            `text: ${JSON.stringify(this.text)}, ` +
            `pos: ${this.pos}, ` +
            `line: ${this.line}, ` +
            `column: ${this.column}>`;
    }

    /**
     * @param {string} type 
     * @param {any} value 
     */
    isEqual(type, value) {
        if (type !== this.type)
            return false;
        if (arguments.length === 2 && value !== this.value)
            return false;
        return true;
    }
}

module.exports = Token;