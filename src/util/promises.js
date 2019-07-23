module.exports = new class PromisesUtils {
    /**
     * @param {number} ms Delay in milliseconds
     * @returns {Promise<void>}
     */
    timeout(ms) {
        return new Promise(res => setTimeout(res, ms));
    }


    /**
     * @returns {Promise<void>}
     */
    immediate() {
        return new Promise(res => setImmediate(res));
    }
};
