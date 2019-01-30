const disk = require("diskusage");
const log = require("./log");

module.exports = async function isEnoughDiskSpace() {
    const info = await disk.check("/");
    const yes = info.available > 1000 * 1000 * 1000;
    if (!yes) log("RUNNING OUT OF DISK SPACE");
    return yes;
};