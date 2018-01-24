const fs = require("fs");
const path = require("path");

/**
 * @param {string} dir 
 * @returns {Promise<string[]>}
 */
function walk(dir) {
    return new Promise((resolve, reject) => {
        let results = [];

        fs.readdir(dir, (err, files) => {
            if (err) return reject(err);
            let pending = files.length;
            if (!pending) return resolve(results);

            files.forEach(file => {
                file = path.resolve(dir, file);

                fs.stat(file, (err, stat) => {
                    if (err) return reject(err);
                    if (stat && stat.isDirectory()) {
                        walk(file).then(files => {
                            results = results.concat(files);
                            if (!--pending) resolve(results);
                        }).catch(err => reject(err));
                    } else {
                        results.push(file);
                        if (!--pending) resolve(results);
                    }
                });
            });
        });
    });
}
module.exports = walk;
