const config = require("../config");
const getTumblrBlog = require("../modules/getTumblrBlog");
const secureRandom = require("../modules/random/secureRandom");
const log = require("../log");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

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

    cr.registerCommand("mlpquote", new SimpleCommand(async message => {
        if (quotes.length === 0) {
            await message.channel.send("Quotes not yet done loading :c come back in a few seconds to minutes");
            return;
        }

        return await secureRandom(quotes);
    }))
        .setHelp(new HelpContent()
            .setDescription("Gets you only a true incorrect my little pony quote. Parsed from https://incorrectmylittleponyquotes.tumblr.com"))
        .setCategory(Category.MLP)
        .dontList()
        .setScope(CommandScope.ALL);
    
    cr.registerAlias("mlpquote", "mlpquotes");
};