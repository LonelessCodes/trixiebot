const PATTERNS = Object.freeze({
    SPLIT: /\s+/
});

module.exports = new class StringUtils {
    normalizeArray(raw, expectedSize) {
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
        return this.normalizeArray(raw, expectedArgs);
    }
};