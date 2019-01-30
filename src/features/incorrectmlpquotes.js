const getTumblrBlog = require("../modules/getTumblrBlog");
const secureRandom = require("../modules/secureRandom");
const log = require("../modules/log");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

const usernameRegExp = /@([\w-]+)\b/g;

module.exports = async function install(cr) {
    let quotes = [];
    getTumblrBlog("incorrectmylittleponyquotes.tumblr.com")
        .then(posts => {
            return posts
                .filter(post => post.tags.includes("incorrect my little pony quotes"))
                .map(post => post.body.trim())
                .filter(post => /\w+:/gi.test(post))
                .map(quote => quote
                    .replace(usernameRegExp, (match, username) => `<http://${username}.tumblr.com>`));
        })
        .then(q => quotes = q)
        .then(() => log("mlpquotes", "loaded"))
        .catch(() => { });

    cr.register("mlpquote", new class extends BaseCommand {
        async call(message) {
            if (quotes.length === 0) {
                await message.channel.send("Quotes not yet done loading :c come back in a few seconds to minutes");
                return;
            }

            const quote = await secureRandom(quotes);
            await message.channel.send(quote);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Gets you only a true incorrect my little pony quote. Parsed from https://incorrectmylittleponyquotes.tumblr.com"))
        .setCategory(Category.MLP)
        .dontList();
    
    cr.registerAlias("mlpquote", "mlpquotes");
};