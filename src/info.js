const path = require("path");
const packageFile = require("../package.json");

const dev = process.env.NODE_ENV === "development";

module.exports = Object.freeze({
    WEBSITE: "https://trixie.loneless.art",
    VERSION: packageFile.version,
    DEV: dev,
    FILES_BASE: path.resolve(path.join(__dirname, "..", "..", dev ? "trixiedevfiles" : "trixiefiles"))
});