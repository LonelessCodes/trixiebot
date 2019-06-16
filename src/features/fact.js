const { promisify } = require("util");
const { timeout } = require("../modules/util");
const { lastItem, randomItem } = require("../modules/util/array");
const config = require("../config");
const log = require("../modules/log");
const Twit = require("twit");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    if (!config.has("twitter")) return log.debug("config", "Found no API credentials for Twitter - Disabled fact command");

    const twitter = new Twit(config.get("twitter"));
    const get = promisify(twitter.get).bind(twitter);

    const facts = new Set();

    const firstSetLoaded = new Promise(async function loadTweets(resolve) {
        let tweets_available = true;
        let smallest_id = null;
        let newest_id = null;
        while (tweets_available) {
            const data = await get("statuses/user_timeline", {
                screen_name: "UberFacts",
                count: 200,
                include_rts: false,
                exclude_replies: true,
                trim_user: true,
                max_id: smallest_id || void 0
            });
            if (!newest_id) newest_id = data[0].id_str;
            if (data.length <= 1) tweets_available = false;
            else {
                smallest_id = lastItem(data).id_str;
                data.filter(tweet => !tweet.entities.urls[0]).map(tweet => facts.add(tweet.text));
            }
            resolve(facts); // indicates that the set now has a few values, and then just continue fetching more
            await timeout(60000 * 15 / 900); // care about rate limits
        }

        log("Loaded all uberfacts:", facts.size);
    }).catch(log);

    async function getFact() {
        return await randomItem([...facts]);
    }

    cr.register("fact", new class extends BaseCommand {
        async call(message) {
            await firstSetLoaded;
            const fact = await getFact();
            await message.channel.send(fact);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Gets random UberFacts fact"))
        .setCategory(Category.UTILS);
    
    cr.registerAlias("fact", "uberfacts");
};