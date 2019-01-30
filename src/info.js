const path = require("path");
const packageFile = require("../package.json");

module.exports = Object.freeze({
    WEBSITE: "https://trixie.loneless.art",
    VERSION: packageFile.version,
    DEV: process.env.NODE_ENV === "development",
    FILES_BASE: path.resolve(path.join(__dirname, "..", "..", process.env.NODE_ENV === "development" ? "trixiedevfiles" : "trixiefiles"))
});