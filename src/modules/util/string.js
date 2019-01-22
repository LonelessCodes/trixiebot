const PATTERNS = Object.freeze({
    SPLIT: /\s+/
});

module.exports = new class StringUtils {
    /**
     * @param {string} raw 
     * @param {number} expectedSize 
     */
    normalizeArray(raw, expectedSize) {
        /**
         * @type {string[]}
         */
        const normalized = new Array(expectedSize).fill("");

        for (let i = 0; i < normalized.length; i++) {
            if (i < raw.length && raw[i]) normalized[i] = raw[i];
        }
        return normalized;
    }

    splitArgs(args, expectedArgs = 0) {
        if (expectedArgs < 1) return [args];

        const raw = new Array;

        let i = 0;
        while(i < expectedArgs - 1) {
            const match = PATTERNS.SPLIT.exec(args);
            if (!match) {
                break;
            } else {
                raw.push(args.substr(0, match.index));
                args = args.substr(match.index + match[0].length);
            }
            i++;
        }
        raw.push(args);
        return module.exports.normalizeArray(raw, expectedArgs);
    }

    findArgs(str) {
        const array = new Array;
        let tmp = "";
        let inquote = false;
        let quote = "";
        let i = 0;
        let char = "";
        while (i < str.length) {
            char = str.charAt(i);
            i++;

            if (char === "\"" || char === "'") {
                if (!inquote) {
                    quote = char;
                    inquote = true;
                } else if (quote !== char) {
                    tmp += char;
                    continue;
                } else if (quote === char) {
                    inquote = false;
                }
            } else if (char === " ") {
                if (inquote) {
                    tmp += char;
                    continue;
                }
            } else {
                tmp += char;
                continue;
            }

            if (tmp !== "") {
                array.push(tmp);
                tmp = "";
            }
        }

        if (tmp !== "") {
            array.push(tmp);
            tmp = "";
        }

        return array;
    }
};