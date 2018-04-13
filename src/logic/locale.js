const log = require("../modules/log");
const fs = require("fs-extra");
const path = require("path");
const Gettext = require("node-gettext");
const { po } = require("gettext-parser");

const gt = new Gettext;

gt.on("error", error => log.error("oh nose", error));

const translationsDir = path.join(__dirname, "../../resources/locale");
const files = fs.readdirSync(translationsDir);
const domain = "messages";

files.forEach(file => {
    const translationsFilePath = path.join(translationsDir, file);
    const translationsContent = fs.readFileSync(translationsFilePath);

    const parsedTranslations = po.parse(translationsContent);
    gt.addTranslations(file.slice("TrixieBot_".length, -path.extname(file)), domain, parsedTranslations);
});

module.exports = gt;
