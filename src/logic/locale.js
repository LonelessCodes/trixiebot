const fs = require("fs-extra");
const path = require("path");
const Gettext = require("node-gettext");
const { po } = require("gettext-parser");

const gt = new Gettext;

const translationsDir = "../../resources/locale";
const locales = ["en", "de", "hu"];
const domain = "messages";

for (const locale of locales) {
    const filename = `${locale}.po`;
    const translationsFilePath = path.join(__dirname, translationsDir, filename);
    const translationsContent = fs.readFileSync(translationsFilePath);

    const parsedTranslations = po.parse(translationsContent);
    gt.addTranslations(locale, domain, parsedTranslations);
}

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

    format(opts = {}) {
        this.opts.format = opts;
    }

    locale(locale = "en") {
        this.opts.locale = locale;
    }

    fetch(num) {
        let str = "";
        if (this.opts.locale) gt.setLocale(this.opts.locale);
        if (num && this.opts.plural) {
            str = gt.ngettext(this.opts.translate, this.opts.plural, num);
        } else {
            str = gt.gettext(this.opts.translate);
        }

        return module.exports.format(str, this.opts.format);
    }
}

module.exports.format = function format(message, format = {}) {
    for (const f in format)
        message = message.replace(new RegExp(`{{${f}}}`, "g"), format[f]);

    return message;
};

module.exports.translate = function translate(message) {
    return new Cursor({ translate: message });
};

module.exports.setLocale = gt.setLocale.bind(gt);

function translate(message, format) {
    module.exports.setLocale(this.guild.config.locale || "en");
    return module.exports.translate(message).format(format).fetch();
}

module.exports.sendTranslated = async function (message, format, embed) {
    return await this.send(translate.bind(this)(message, format), embed);
};

module.exports.translate = translate;
