const packageFile = require("../package.json");

module.exports = Object.freeze({
    WEBSITE: "https://trixie.loneless.org",
    VERSION: packageFile.version,
    DEV: process.env.NODE_ENV === "development"
});