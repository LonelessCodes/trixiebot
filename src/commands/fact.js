const { promisify } = require("util");
const { timeout } = require("../util/promises");
const { lastItem, randomItem } = require("../util/array");
const config = require("../config");
const log = require("../log");
const Twit = require("twit");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

module.exports = function install(cr) {
    if (!config.has("twitter")) return log.namespace("config", "Found no API credentials for Twitter - Disabled fact command");

    const twitter = new Twit(config.get("twitter"));
    const get = promisify(twitter.get).bind(twitter);

    const facts = new Promise(async resolve => {
        const facts = new Set();

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
                max_id: smallest_id || undefined,
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

        log.namespace("fact cmd")("Facts loaded:", facts.size);
    }).catch(log);

    async function getFact() {
        return await randomItem([...(await facts)]);
    }

    cr.registerCommand("fact", new SimpleCommand(() => getFact()))
        .setHelp(new HelpContent()
            .setDescription("Gets random UberFacts fact"))
        .setCategory(Category.UTILS)
        .setScope(CommandScope.ALL, true);

    cr.registerAlias("fact", "uberfacts");
};
