const secureRandom = require("../modules/random/secureRandom");

module.exports = new class ArrayUtils {
    randomItem(arr) {
        return secureRandom(arr);
    }

    lastItem(arr) {
        return arr[arr.length - 1];
    }

    findAndRemove(arr, elem) {
        const i = arr.indexOf(elem);
        if (i > -1) arr.splice(i, 1);
    }

    roll(array, roller, end) {
        return new Promise(resolve => {
            let index = 0;
            const next = () => {
                index++;
                if (index < array.length) {
                    const r = roller(array[index], index, () => next());
                    if (r.then) r.then(() => next());
                } else if (end) {
                    end();
                    resolve();
                }
            };
            if (array.length === 0) {
                if (end) end();
                resolve();
                return;
            }
            const r = roller(array[index], index, next);
            if (r.then) r.then(next);
        });
    }
};
