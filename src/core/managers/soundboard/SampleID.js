const nanoid = require("nanoid/generate");

class SampleID {
    /**
     * Checks if a string is a valid SampleID string
     * @param {string} id 
     */
    static isId(id) {
        return SampleID.REGEX.test(id);
    }

    static generate() {
        return SampleID.PREFIX + nanoid(SampleID.CHARSET, SampleID.LENGTH);
    }
}
SampleID.PREFIX = "i";
SampleID.CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";
SampleID.LENGTH = 6;
SampleID.REGEX = new RegExp(`^${SampleID.PREFIX}[${SampleID.CHARSET}]{${SampleID.LENGTH}}$`);

module.exports = SampleID;