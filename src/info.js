const path = require("path");
const config = require("./config");
const packageFile = require("../package.json");

const dev = process.env.NODE_ENV === "development";

if (!config.has("user_files_dir")) throw new Error("No user files dir specified in config");

module.exports = Object.freeze({
    WEBSITE: config.get("website_url"),
    INVITE: config.get("invite_url"),
    VERSION: packageFile.version,
    DEV: dev,
    FILES_BASE: path.resolve(path.join(__dirname, "..", "..", config.get("user_files_dir"))),
});
