const fs = require("fs");
const path = require("path");
const disk = require("diskusage");
const log = require("../log");

class FilesUtils {
    /**
     * @param {string} dir 
     * @returns {Promise<string[]>}
     */
    walk(dir) {
        return new Promise((resolve, reject) => {
            let results = [];

            fs.readdir(dir, (err, files) => {
                if (err) return reject(err);
                let pending = files.length;
                if (!pending) return resolve(results);

                for (let file of files) {
                    file = path.resolve(dir, file);

                    fs.stat(file, (err, stat) => {
                        if (err) return reject(err);
                        if (stat && stat.isDirectory()) {
                            module.exports.walk(file).then(files => {
                                results = results.concat(files);
                                if (!--pending) resolve(results);
                            }).catch(err => reject(err));
                        } else {
                            results.push(file);
                            if (!--pending) resolve(results);
                        }
                    });
                }
            });
        });
    }

    async isEnoughDiskSpace() {
        const info = await disk.check("/");
        const yes = info.available > 1000 * 1000 * 1000;
        if (!yes) log("RUNNING OUT OF DISK SPACE");
        return yes;
    }
}

module.exports = new FilesUtils;