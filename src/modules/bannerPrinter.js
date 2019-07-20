const fs = require("fs");
const path = require("path");

module.exports = function bannerPrinter(trixie, discord) {
    const txt = fs.readFileSync(path.join(__dirname, "..", "..", "assets", "text", "banner.txt"), "utf8");
    console.log(txt, trixie, discord);
};