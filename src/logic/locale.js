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

    fetch(num) {
        let str = "";
        if (num && this.opts.plural) {
            str = gt.ngettext(this.opts.translate, this.opts.plural, num);
        } else {
            str = gt.gettext(this.opts.translate);
        }

        if (this.opts.format)
            for (const f in this.opts.format)
                str = str.replace(new RegExp(`{{${f}}}`, "g"), this.opts.format[f]);

        return str;
    }
}

module.exports.translate = function translate(message) {
    return new Cursor({ translate: message });
};

module.exports.setLocale = gt.setLocale.bind(gt);

function translate(message, format) {
    module.exports.setLocale(this.guild.config.locale);
    return module.exports.translate(message).format(format).fetch();
}

module.exports.sendTranslated = async function (message, embed, format) {
    return await this.send(translate.bind(this)(message, format), embed);
};

module.exports.translate = translate;
