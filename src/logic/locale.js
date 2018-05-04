const fs = require("fs-extra");
const path = require("path");
const Gettext = require("node-gettext");
const { po } = require("gettext-parser");

const gt = new Gettext;

const translationsDir = "../../resources/locale";
const locales = ["en", "de", "hu"];
const domain = "messages";

locales.forEach(locale => {
    const filename = `${locale}.po`;
    const translationsFilePath = path.join(translationsDir, filename);
    const translationsContent = fs.readSync(translationsFilePath);

    const parsedTranslations = po.parse(translationsContent);
    gt.addTranslations(locale, domain, parsedTranslations);
});

gt.setTextDomain(domain);

class Cursor {
    constructor(opts = {}) {
        this.opts = opts;
    }

    translate(message) {
        this.opts.translate = message;
        return this;
    }

    ifPlural(message) {
        this.opts.plural = message;
        return this;
    }

    fetch(num) {
        if (num && this.opts.plural) {
            return gt.ngettext(this.opts.translate, this.opts.plural, num);
        } else {
            return gt.gettext(this.opts.translate);
        }
    }
}

module.exports.translate = function translate(message) {
    return new Cursor({ translate: message });
};

module.exports.setLocale = gt.setLocale;

module.exports.sendTranslated = async function (message, embed) {
    return await this.channel.send(module.exports.autoTranslate.bind(this)(message), embed);
};

module.exports.autoTranslate = function (message) {
    module.exports.setLocale(this.config.locale);
    return module.exports.translate(message).fetch();
};
