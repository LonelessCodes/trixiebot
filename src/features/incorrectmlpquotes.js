const config = require("../config");
const getTumblrBlog = require("../modules/getTumblrBlog");
const secureRandom = require("../modules/secureRandom");
const log = require("../modules/log");

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

const usernameRegExp = /@([\w-]+)\b/g;

module.exports = async function install(cr) {
    if (!config.has("tumblr.key")) return log.namespace("config", "Found no API token for Tumblr - Disabled mlpquote command");

    let quotes = [];
    getTumblrBlog(config.get("tumblr.key"), "incorrectmylittleponyquotes.tumblr.com")
        .then(posts => {
            return posts
                .filter(post => post.tags.includes("incorrect my little pony quotes"))
                .map(post => post.body.trim())
                .filter(post => /\w+:/gi.test(post))
                .map(quote => quote
                    .replace(usernameRegExp, (match, username) => `<http://${username}.tumblr.com>`));
        })
        .then(q => quotes = q)
        .then(() => log.namespace("mlpquote cmd")("Quotes loaded:", quotes.length))
        .catch(() => { });

    cr.register("mlpquote", new SimpleCommand(async message => {
        if (quotes.length === 0) {
            await message.channel.send("Quotes not yet done loading :c come back in a few seconds to minutes");
            return;
        }

        return await secureRandom(quotes);
    }))
        .setHelp(new HelpContent()
            .setDescription("Gets you only a true incorrect my little pony quote. Parsed from https://incorrectmylittleponyquotes.tumblr.com"))
        .setCategory(Category.MLP)
        .dontList();
    
    cr.registerAlias("mlpquote", "mlpquotes");
};