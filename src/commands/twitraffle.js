// const { promisify } = require("util");
// const fetch = require("node-fetch");
// const CONST = require("../const");
// const config = require("../config");
// const log = require("../log");
// const Discord = require("discord.js");

// const SimpleCommand = require("../core/commands/SimpleCommand");
// const HelpContent = require("../util/commands/HelpContent");
// const Category = require("../util/commands/Category");

// const Twit = require("twit");

// const tweet_regex = /^(?:http:\/\/|https:\/\/)?(?:www\.twitter\.com|twitter\.com|mobile\.twitter\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)\b/;

module.exports = async function install(cr) {
    // if (!config.has("twitter")) return log.namespace("config", "Found no API credentials for Twitter - Disabled twitraffle command");

    // const twitter = new Twit(config.get("twitter"));
    // const get = promisify(twitter.get).bind(twitter);
    // const post = promisify(twitter.post).bind(twitter);

    // cr.registerCommand("twitraffle", new SimpleCommand(async (message, url) => {
    //     // const match = url.match(tweet_regex);
    //     // if (!match) return "Provide a valid tweet URL pls";

    //     // const [, username, id] = match;

    //     // const tweet = await get("statuses/show", { id });

    //     // const embed = new Discord.RichEmbed()
    //     //     .setColor(CONST.COLOR.PRIMARY)
    //     //     .setDescription("Reply like this: `retweet follow winners:3` or `retweet reply winner:1` etc.")
    //     //     .addField("What's required to qualify?",
    //     //         "`retweet` - must have retweeted the raffle\n" +
    //     //         "`like` - must have liked the raffle\n" +
    //     //         "`follow` - must follow the raffle holder\n" +
    //     //         "`reply` - must have replied to the raffle tweet")
    //     //     .addField("What the result should look like?",
    //     //         "`winners:integer` - how many winners to pick. Default: 1");
    //     // const msg = await message.channel.send("How should I analyse the raffle?", { embed });

    //     // const msgs = await message.channel.awaitMessages(m => m.author.equals(message.author), { maxMatches: 1, time: 60000 });
    //     // if (msgs.size === 0) return;

    //     // const m = msgs.first();
    //     // if (m.content.toLowerCase() === "cancel") return;

    //     // const args = m.content.toLowerCase().split(" ");

    //     // const opts = {
    //     //     retweet: false,
    //     //     like: false,
    //     //     follow: false,
    //     //     reply: false,
    //     //     winners: 1
    //     // };
    //     // for (const arg of args) {
    //     //     if (arg === "retweet") opts.retweet = true;
    //     //     if (arg === "like") opts.like = true;
    //     //     if (arg === "follow") opts.follow = true;
    //     //     if (arg === "reply") opts.reply = true;
    //     //     if (arg.startsWith("winners:")) opts.winners = parseInt(arg.slice(8));
    //     // }



    //     // const rt = await post("oauth/request_token");
    //     // console.log(rt)

    //     // const rt = await fetch("https://api.twitter.com/oauth/request_token", {
    //     //     method: "POST",
    //     //     headers: {

    //     //     }
    //     // })
    // }))
    //     .setHelp(new HelpContent()
    //         .setDescription("Analyse a Twitter raffle by URL")
    //         .setUsage("<url>")
    //         .addParameterOptional("url", "The URL to the Tweet to analyse"))
    //     .setCategory(Category.UTILS);
};